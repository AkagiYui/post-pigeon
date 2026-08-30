#!/usr/bin/env python3
"""
从两个 tag 之间的 conventional commits 生成 Markdown 变更日志，输出到 stdout。

正式版以上一个正式版为基线（beta / rc 不会把范围截断）；预发布版以上一个
语义化版本为基线。

用法：
  python3 scripts/generate_changelog.py            # 最新语义化版本 tag
  python3 scripts/generate_changelog.py v1.2.0     # 指定目标 tag
  python3 scripts/generate_changelog.py v1.2.0 --previous
"""

import argparse
import os
import re
import subprocess
import sys

from release_range import resolve_range

# conventional commit 类型 -> 变更日志分组标题（未列出的类型归入「其他」，
# docs/style/chore/test 等噪音类型不进入变更日志）
SECTIONS = {
    "feat": "✨ 新功能",
    "fix": "🐛 问题修复",
    "perf": "⚡ 性能优化",
    "refactor": "♻️ 重构",
    "revert": "⏪ 回滚",
    "security": "🔒 安全",
}

COMMIT_RE = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<breaking>!)?:\s*(?P<subject>.+)$")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="从发版区间内的 Conventional Commits 生成清单")
    parser.add_argument("target", nargs="?", help="目标 tag；默认取最高语义化版本 tag")
    parser.add_argument("--previous", action="store_true", help="只输出计算出的比较基线 tag")
    args = parser.parse_args()

    try:
        target, previous = resolve_range(args.target)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"无法确定发版区间：{exc}", file=sys.stderr)
        return 2

    if args.previous:
        print(previous or "")
        return 0

    rev_range = f"{previous}..{target}" if previous else target
    log = git("log", rev_range, "--no-merges", "--pretty=format:%H%x1f%s")

    grouped: dict[str, list[str]] = {}
    breaking: list[str] = []
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
    for line in log.splitlines():
        if not line:
            continue
        sha, subject = line.split("\x1f", 1)
        match = COMMIT_RE.match(subject)
        if not match:
            continue
        ctype = match.group("type")
        scope = match.group("scope")
        text = match.group("subject")
        commit_ref = f"`{sha[:7]}`"
        if repository:
            commit_ref = f"[`{sha[:7]}`]({server}/{repository}/commit/{sha})"
        entry = f"- {f'**{scope}**: ' if scope else ''}{text} ({commit_ref})"
        if match.group("breaking"):
            breaking.append(entry)
        if ctype in SECTIONS:
            grouped.setdefault(SECTIONS[ctype], []).append(entry)

    out: list[str] = []
    if breaking:
        out.append("### 💥 破坏性变更\n")
        out.extend(breaking)
        out.append("")
    for title in SECTIONS.values():
        if title in grouped:
            out.append(f"### {title}\n")
            out.extend(grouped[title])
            out.append("")

    if not out:
        out.append("本次发布无功能性变更。")

    if previous:
        label = f"{previous}...{target}"
        if repository:
            label = f"[{label}]({server}/{repository}/compare/{previous}...{target})"
        out.append(f"\n**完整变更**：{label}")

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
