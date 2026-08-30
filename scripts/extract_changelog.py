#!/usr/bin/env python3
"""
从 CHANGELOG.md 抽取指定版本的小节，输出 Markdown 到 stdout。

CHANGELOG.md 是面向使用者的变更日志的唯一事实源：这里抽出来的内容既是
GitHub Release 的正文，也是应用内更新提示展示的内容（应用会把
CHANGELOG.md 作为 Release 资产下载下来，按版本区间截取）。

用法：
  python3 scripts/extract_changelog.py v1.2.0
  python3 scripts/extract_changelog.py v1.2.0 --release-notes
  python3 scripts/extract_changelog.py v1.2.0 --file CHANGELOG.md

找不到对应版本时不会失败：输出一行提示，让发版流程继续，由后面的提交汇总兜底。
"""

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from release_range import normalize, parse, resolve_range

# ## [1.2.0] - 2026-08-26 / ## 1.2.0 / ## [未发布]
HEADING_RE = re.compile(r"^##\s+\[?([^\]\s]+)\]?(?:\s*[-–—]\s*(\S+))?")


@dataclass(frozen=True)
class VersionSection:
    version: str
    date: str
    body: str


def sections(markdown: str) -> list[VersionSection]:
    """拆出全部二级版本小节，保留小节正文的 Markdown。"""
    lines = markdown.splitlines()
    headings: list[tuple[int, re.Match[str]]] = []
    for index, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if match:
            headings.append((index, match))

    result: list[VersionSection] = []
    for pos, (start, match) in enumerate(headings):
        end = headings[pos + 1][0] if pos + 1 < len(headings) else len(lines)
        body_lines = [
            line for line in lines[start + 1:end]
            if not re.match(r"^\[[^\]]+\]:\s", line)
        ]
        result.append(VersionSection(
            version=normalize(match.group(1)),
            date=match.group(2) or "",
            body="\n".join(body_lines).strip("\n"),
        ))
    return result


def extract(markdown: str, version: str) -> str | None:
    """返回指定版本小节的正文（不含 ## 标题），找不到时返回 None。"""
    want = normalize(version)
    for section in sections(markdown):
        if section.version == want:
            return section.body
    return None


def shift_section_headings(markdown: str) -> str:
    """把版本正文里的 ``###`` 降一级，放到预发布版本标题之下。"""
    return re.sub(r"^###(?!#)", "####", markdown, flags=re.MULTILINE)


def render_release_notes(markdown: str, target: str, previous: str | None) -> str | None:
    """生成面向发布页的正文；正式版包含上一个正式版之后的所有预发布小节。"""
    target_name = normalize(target)
    target_version = parse(target_name)
    if target_version is None:
        return extract(markdown, target_name)

    parsed = [section for section in sections(markdown) if parse(section.version)]
    current = next((section for section in parsed if section.version == target_name), None)
    if current is None:
        return None
    if not target_version.stable:
        return current.body

    previous_version = parse(previous or "")
    included = [
        section for section in parsed
        if parse(section.version) <= target_version
        and (previous_version is None or parse(section.version) > previous_version)
    ]
    included.sort(key=lambda section: parse(section.version), reverse=True)
    prereleases = [section for section in included if section.version != target_name]

    start = previous or "项目开始"
    scope = f"`{start}...v{target_name}`" if previous else f"项目开始至 `v{target_name}`"
    count_text = f"，其中包含 {len(prereleases)} 个预发布版本" if prereleases else ""
    output = [f"> 本正式版汇总 {scope} 期间的全部用户可见变更{count_text}。", "", current.body]

    if prereleases:
        output.extend(["", "## 预发布阶段变更", ""])
        for section in prereleases:
            title = f"### v{section.version}"
            if section.date:
                title += f" · {section.date}"
            output.extend([title, "", shift_section_headings(section.body), ""])
    return "\n".join(output).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="从 CHANGELOG.md 抽取指定版本的小节")
    parser.add_argument("version", help="版本号或 tag（如 v1.2.0）")
    parser.add_argument("--file", default="CHANGELOG.md", help="变更日志路径")
    parser.add_argument(
        "--release-notes", action="store_true",
        help="正式版聚合上一个正式版之后的全部版本小节",
    )
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"::warning::{path} 不存在，跳过变更日志抽取", file=sys.stderr)
        return 0

    markdown = path.read_text(encoding="utf-8")
    if args.release_notes:
        try:
            _, previous = resolve_range(args.version)
        except (ValueError, subprocess.CalledProcessError) as exc:
            print(f"::error::无法确定发版区间：{exc}", file=sys.stderr)
            return 2
        section = render_release_notes(markdown, args.version, previous)
    else:
        section = extract(markdown, args.version)
    if section is None:
        version = normalize(args.version)
        print(f"::warning::CHANGELOG.md 中没有 {version} 的小节，发布说明将只有提交汇总", file=sys.stderr)
        print("> 本次发布未在 CHANGELOG.md 中登记条目。")
        return 0

    print(section.strip("\n"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
