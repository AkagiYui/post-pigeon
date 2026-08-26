#!/usr/bin/env python3
"""
从 CHANGELOG.md 抽取指定版本的小节，输出 Markdown 到 stdout。

CHANGELOG.md 是面向使用者的变更日志的唯一事实源：这里抽出来的内容既是
GitHub Release 的正文，也是应用内更新提示展示的内容（应用会把
CHANGELOG.md 作为 Release 资产下载下来，按版本区间截取）。

用法：
  python3 scripts/extract_changelog.py v1.2.0
  python3 scripts/extract_changelog.py v1.2.0 --file CHANGELOG.md

找不到对应版本时不会失败：输出一行提示，让发版流程继续，由后面的提交汇总兜底。
"""

import argparse
import re
import sys
from pathlib import Path

# ## [1.2.0] - 2026-08-26 / ## 1.2.0 / ## [未发布]
HEADING_RE = re.compile(r"^##\s+\[?([^\]\s]+)\]?(?:\s*[-–—]\s*(\S+))?")


def normalize(version: str) -> str:
    """去掉首尾空白与 v 前缀。"""
    version = version.strip()
    if len(version) > 1 and version[0] in "vV":
        version = version[1:]
    return version


def extract(markdown: str, version: str) -> str | None:
    """返回指定版本小节的正文（不含 ## 标题），找不到时返回 None。"""
    want = normalize(version)
    lines = markdown.splitlines()

    start = None
    for i, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if not match:
            continue
        if start is not None:
            # 下一个版本标题，本小节到此为止
            return "\n".join(lines[start:i]).strip("\n")
        if normalize(match.group(1)) == want:
            start = i + 1

    if start is None:
        return None
    return "\n".join(lines[start:]).strip("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="从 CHANGELOG.md 抽取指定版本的小节")
    parser.add_argument("version", help="版本号或 tag（如 v1.2.0）")
    parser.add_argument("--file", default="CHANGELOG.md", help="变更日志路径")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"::warning::{path} 不存在，跳过变更日志抽取", file=sys.stderr)
        return 0

    section = extract(path.read_text(encoding="utf-8"), args.version)
    if section is None:
        version = normalize(args.version)
        print(f"::warning::CHANGELOG.md 中没有 {version} 的小节，发布说明将只有提交汇总", file=sys.stderr)
        print("> 本次发布未在 CHANGELOG.md 中登记条目。")
        return 0

    # 去掉版本小节末尾可能存在的链接引用定义
    lines = [line for line in section.splitlines() if not re.match(r"^\[[^\]]+\]:\s", line)]
    print("\n".join(lines).strip("\n"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
