#!/usr/bin/env python3
"""
从两个 tag 之间的 conventional commits 生成 Markdown 变更日志，输出到 stdout。

用法：
  python3 scripts/generate_changelog.py            # 最新 tag 与上一个 tag 之间
  python3 scripts/generate_changelog.py v1.2.0     # 指定目标 tag
"""

import re
import subprocess
import sys

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


def resolve_range(target: str | None) -> tuple[str, str | None]:
    """返回 (目标 tag, 上一个 tag)；上一个 tag 不存在时为 None（取全部历史）。"""
    tags = [t for t in git("tag", "--sort=-creatordate").splitlines() if t]
    if target is None:
        target = tags[0] if tags else "HEAD"
    if target in tags:
        idx = tags.index(target)
        previous = tags[idx + 1] if idx + 1 < len(tags) else None
    else:
        previous = tags[0] if tags else None
    return target, previous


def main() -> int:
    target, previous = resolve_range(sys.argv[1] if len(sys.argv) > 1 else None)
    rev_range = f"{previous}..{target}" if previous else target
    log = git("log", rev_range, "--no-merges", "--pretty=format:%H%x1f%s")

    grouped: dict[str, list[str]] = {}
    breaking: list[str] = []
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
        entry = f"- {f'**{scope}**: ' if scope else ''}{text} (`{sha[:7]}`)"
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
        out.append(f"\n**完整变更**: {previous}...{target}")

    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
