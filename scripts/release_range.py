#!/usr/bin/env python3
"""发版 tag 的语义化版本解析与比较区间选择。

正式版必须以上一个正式版为基线，不能让 beta / rc tag 截断它的发布说明；
预发布版则以上一个语义化版本为基线，方便 beta.2 只列出 beta.1 之后的提交。
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from functools import total_ordering


SEMVER_RE = re.compile(
    r"^v?(?P<major>0|[1-9][0-9]*)\."
    r"(?P<minor>0|[1-9][0-9]*)\."
    r"(?P<patch>0|[1-9][0-9]*)"
    r"(?:-(?P<pre>[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)


@total_ordering
@dataclass(frozen=True)
class SemVer:
    major: int
    minor: int
    patch: int
    prerelease: tuple[str, ...] = ()

    @property
    def stable(self) -> bool:
        return not self.prerelease

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, SemVer):
            return NotImplemented
        left = (self.major, self.minor, self.patch)
        right = (other.major, other.minor, other.patch)
        if left != right:
            return left < right
        if self.stable != other.stable:
            return not self.stable
        if self.stable:
            return False
        return compare_prerelease(self.prerelease, other.prerelease) < 0


def compare_prerelease(left: tuple[str, ...], right: tuple[str, ...]) -> int:
    for a, b in zip(left, right):
        if a == b:
            continue
        a_num, b_num = a.isdigit(), b.isdigit()
        if a_num and b_num:
            return -1 if int(a) < int(b) else 1
        if a_num != b_num:
            return -1 if a_num else 1
        return -1 if a < b else 1
    return (len(left) > len(right)) - (len(left) < len(right))


def parse(version: str) -> SemVer | None:
    match = SEMVER_RE.fullmatch(version.strip())
    if not match:
        return None
    prerelease = tuple((match.group("pre") or "").split(".")) if match.group("pre") else ()
    # SemVer 不允许纯数字预发布标识符带前导零。
    if any(part.isdigit() and len(part) > 1 and part[0] == "0" for part in prerelease):
        return None
    return SemVer(
        int(match.group("major")),
        int(match.group("minor")),
        int(match.group("patch")),
        prerelease,
    )


def normalize(version: str) -> str:
    version = version.strip()
    return version[1:] if len(version) > 1 and version[0] in "vV" else version


def select_previous(target: str, tags: list[str]) -> str | None:
    """选出目标版本的比较基线；正式版忽略所有预发布 tag。"""
    target_version = parse(target)
    if target_version is None:
        raise ValueError(f"不是合法的语义化版本：{target}")

    candidates: list[tuple[SemVer, str]] = []
    for tag in tags:
        version = parse(tag)
        if version is None or version >= target_version:
            continue
        if target_version.stable and not version.stable:
            continue
        candidates.append((version, tag))
    if not candidates:
        return None
    return max(candidates, key=lambda item: item[0])[1]


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], check=True, capture_output=True, text=True
    ).stdout.strip()


def resolve_range(target: str | None = None) -> tuple[str, str | None]:
    """返回 ``(目标 tag, 比较基线 tag)``。"""
    all_tags = [tag for tag in git("tag").splitlines() if parse(tag)]
    if not all_tags:
        if target is None:
            raise ValueError("仓库里没有语义化版本 tag")
        return target, None

    if target is None:
        target = max(all_tags, key=lambda tag: parse(tag))
    elif target not in all_tags and not target.startswith("v") and f"v{target}" in all_tags:
        target = f"v{target}"

    if parse(target) is None:
        raise ValueError(f"目标 tag 不是合法的语义化版本：{target}")

    # 只考虑目标提交的祖先 tag，避免其它维护分支上的 tag 混入比较范围。
    merged = [tag for tag in git("tag", "--merged", target).splitlines() if tag]
    return target, select_previous(target, merged)
