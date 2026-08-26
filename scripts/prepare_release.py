#!/usr/bin/env python3
"""
发版前的准备工作：把版本号与变更日志一次性对齐，并提交。

做三件事：
  1. 把 build/config.yml 的 info.version 设为目标版本
  2. 把 CHANGELOG.md 的 `## [未发布]` 改写成 `## [1.2.0] - YYYY-MM-DD`，
     并在它上面新开一个空的 `## [未发布]`
  3. 自检（scripts/check_release.py），通过后提交这两个文件

之后打 tag 推送即可。pre-push 钩子与 CI 都会再校验一遍 tag 与 config.yml 是否
一致，所以漏掉这一步不会悄悄发出一个版本号对不上的包。

用法：
  python3 scripts/prepare_release.py 1.2.0
  python3 scripts/prepare_release.py 1.2.0 --date 2026-09-01
  python3 scripts/prepare_release.py 1.2.0 --no-commit   # 只改文件，自己提交
"""

import argparse
import datetime
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_release  # noqa: E402  （同目录模块，需先设好 sys.path）
import set_version  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CHANGELOG = ROOT / "CHANGELOG.md"

# 未发布小节的标题，中英两种写法都认
# 行尾只吃空格与制表符：写成 \s*$ 的话贪婪的 \s 会连标题后面的空行一起吞掉，
# 定版后 `## [1.2.0]` 会直接贴着 `### 新增`
UNRELEASED_RE = re.compile(r"^##[ \t]+\[?(未发布|Unreleased)\]?[ \t]*$", re.MULTILINE | re.IGNORECASE)


def git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)


def bump_config(version: str) -> bool:
    """把 config.yml 的版本号设为 version；已经是该值时返回 False。"""
    text = set_version.CONFIG.read_text(encoding="utf-8")
    if set_version.normalize(set_version.read_version(text) or "") == version:
        return False
    new_text, count = set_version.replace_version(text, version)
    if count == 0:
        raise SystemExit(f"未在 {set_version.CONFIG} 中找到 version 字段")
    set_version.CONFIG.write_text(new_text, encoding="utf-8")
    return True


def roll_changelog(version: str, date: str) -> None:
    """把「未发布」小节定版为 version，并在上面新开一个空的「未发布」。"""
    text = CHANGELOG.read_text(encoding="utf-8")

    if check_release.changelog_section(text, version) is not None:
        raise SystemExit(f"CHANGELOG.md 里已经有 {version} 的小节了，不要重复定版")

    match = UNRELEASED_RE.search(text)
    if not match:
        raise SystemExit("CHANGELOG.md 里没有「## [未发布]」小节，无法定版")

    body = check_release.changelog_section(text, "未发布")
    if not body:
        raise SystemExit("「未发布」小节是空的，没有可发布的内容")

    replacement = f"## [未发布]\n\n## [{version}] - {date}"
    CHANGELOG.write_text(text[: match.start()] + replacement + text[match.end():], encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="准备发版：对齐版本号与变更日志")
    parser.add_argument("version", help="目标版本号（如 1.2.0，带不带 v 都行）")
    parser.add_argument("--date", help="发布日期，默认今天（YYYY-MM-DD）")
    parser.add_argument("--no-commit", action="store_true", help="只改文件，不提交")
    args = parser.parse_args()

    version = set_version.normalize(args.version)
    if not set_version.is_valid(version):
        print(f"非法版本号: {version}", file=sys.stderr)
        return 1
    date = args.date or datetime.date.today().isoformat()

    changed_config = bump_config(version)
    roll_changelog(version, date)

    print(f"build/config.yml  版本号 → {version}" + ("" if changed_config else "（已是该值）"))
    print(f"CHANGELOG.md      「未发布」→ ## [{version}] - {date}，并新开空的「未发布」")

    problems = check_release.check(f"v{version}", ref=None, check_remote=False)
    if problems:
        print("\n自检未通过：", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    if args.no_commit:
        print(f"\n未提交。确认改动后：\n  git commit -m 'chore(release): {version}' -- build/config.yml CHANGELOG.md")
    else:
        # 只提交这两个文件，不把工作区里其它改动一起卷进来
        result = git("commit", "-m", f"chore(release): {version}", "--",
                     "build/config.yml", "CHANGELOG.md")
        if result.returncode != 0:
            print(result.stdout + result.stderr, file=sys.stderr)
            return 1
        print(f"\n已提交 chore(release): {version}")

    print(f"\n接下来：\n  git tag v{version}\n  git push origin master v{version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
