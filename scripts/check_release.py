#!/usr/bin/env python3
"""
校验一个发版 tag 是否自洽。本地 pre-push 钩子与 CI 都跑它。

校验四项：
  1. tag 形如 vX.Y.Z，可带预发布后缀（v1.2.0 / v1.2.0-beta.1）
  2. build/config.yml 的 info.version 与 tag（去掉 v）严格相等
  3. CHANGELOG.md 里有该版本的小节，且小节非空
  4. （--check-remote）远端还不存在同名 tag

第 2 项是重点：应用运行时拿注入的 config.Version 与 GitHub Release 的 tag 比对
来判断有没有新版本，两边对不上会表现为「装了新版却一直提示有更新」，而且要等
产物发出去之后才会被发现。

用法：
  python3 scripts/check_release.py v1.2.0                 # 校验工作区文件
  python3 scripts/check_release.py v1.2.0 --ref <sha>     # 校验某个提交的文件树
  python3 scripts/check_release.py v1.2.0 --check-remote  # 顺带查远端 tag 是否已存在
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import set_version  # noqa: E402  （同目录模块，需先设好 sys.path）

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = "build/config.yml"
CHANGELOG_PATH = "CHANGELOG.md"

# 发版 tag：v + 语义化版本
TAG_RE = re.compile(r"^v(?P<version>[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.\-]+)?)$")

# ## [1.2.0] - 2026-08-26 / ## 1.2.0 / ## [未发布]
HEADING_RE = re.compile(r"^##\s+\[?([^\]\s]+)\]?")


def read_file(path: str, ref: str | None) -> str | None:
    """读取文件内容；给了 ref 就从该提交的文件树里读，否则读工作区。"""
    if ref is None:
        full = ROOT / path
        return full.read_text(encoding="utf-8") if full.exists() else None

    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"],
        cwd=ROOT, capture_output=True, text=True,
    )
    return result.stdout if result.returncode == 0 else None


def changelog_section(markdown: str, version: str) -> str | None:
    """返回指定版本小节的正文，找不到时返回 None。"""
    lines = markdown.splitlines()
    start = None
    for i, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if not match:
            continue
        if start is not None:
            return "\n".join(lines[start:i]).strip()
        if set_version.normalize(match.group(1)) == version:
            start = i + 1
    return "\n".join(lines[start:]).strip() if start is not None else None


def remote_tag_exists(tag: str) -> bool:
    """查询远端是否已有同名 tag；查不动（离线等）时按不存在处理。"""
    result = subprocess.run(
        ["git", "ls-remote", "--tags", "origin", f"refs/tags/{tag}"],
        cwd=ROOT, capture_output=True, text=True,
    )
    return result.returncode == 0 and bool(result.stdout.strip())


def check(tag: str, ref: str | None, check_remote: bool) -> list[str]:
    """返回所有失败原因；全部通过时返回空列表。"""
    problems: list[str] = []

    match = TAG_RE.match(tag)
    if not match:
        problems.append(
            f"tag「{tag}」格式不合法，应形如 v1.2.0 或 v1.2.0-beta.1"
        )
        # 版本号都取不出来，后面的检查没有意义
        return problems
    version = match.group("version")

    config = read_file(CONFIG_PATH, ref)
    if config is None:
        problems.append(f"读不到 {CONFIG_PATH}")
    else:
        actual = set_version.read_version(config)
        if actual is None:
            problems.append(f"{CONFIG_PATH} 里没有 info.version 字段")
        elif set_version.normalize(actual) != version:
            problems.append(
                f"{CONFIG_PATH} 的版本号是 {actual}，与 tag 的 {version} 不一致\n"
                f"      修复：python3 scripts/prepare_release.py {version}"
            )

    changelog = read_file(CHANGELOG_PATH, ref)
    if changelog is None:
        problems.append(f"读不到 {CHANGELOG_PATH}")
    else:
        section = changelog_section(changelog, version)
        if section is None:
            problems.append(
                f"{CHANGELOG_PATH} 里没有 {version} 的小节\n"
                f"      修复：python3 scripts/prepare_release.py {version}"
            )
        elif not section:
            problems.append(f"{CHANGELOG_PATH} 里 {version} 的小节是空的")

    if check_remote and remote_tag_exists(tag):
        problems.append(f"远端已存在 tag {tag}，不能重复发布")

    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="校验发版 tag 与仓库内容是否自洽")
    parser.add_argument("tag", help="发版 tag（如 v1.2.0）")
    parser.add_argument("--ref", help="从该提交的文件树读取文件，默认读工作区")
    parser.add_argument("--check-remote", action="store_true", help="顺带检查远端是否已有同名 tag")
    args = parser.parse_args()

    problems = check(args.tag, args.ref, args.check_remote)
    if problems:
        print(f"发版校验未通过（{args.tag}）：", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    print(f"发版校验通过：{args.tag}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
