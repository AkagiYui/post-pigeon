#!/usr/bin/env python3
"""
读写 build/config.yml 的 info.version 字段。

版本号在三个地方必须一致：git tag、build/config.yml、以及构建产物里经 ldflags
注入的 config.Version（Taskfile 的 APP_VERSION 读的就是 config.yml）。应用运行
时拿 config.Version 和 GitHub Release 的 tag 比对来判断有没有新版本，对不上就
会出现「装了新版却一直提示更新」这类没人能一眼看懂的问题，所以发版流程会在
本地钩子与 CI 两处校验它们相等（见 scripts/check_release.py）。

本模块同时作为命令行工具与其它脚本的公共实现使用。

用法：
  python3 scripts/set_version.py 1.2.0
"""

import pathlib
import re
import sys

CONFIG = pathlib.Path(__file__).resolve().parent.parent / "build" / "config.yml"

# 匹配 `  version: "0.0.1" # 注释` 形式，仅替换引号内的值，保留缩进与行尾注释。
# 顶层的 `version: '3'`（Taskfile schema 版本）没有缩进，不会被匹配；
# 被注释掉的 ios.version 以 # 开头，同样不会被匹配。
VERSION_RE = re.compile(r'^(\s+version:\s*")([^"]*)(".*)$', re.MULTILINE)

# 语义化版本：主.次.修订，可带预发布后缀
SEMVER_RE = re.compile(r"^[0-9]+(\.[0-9]+)*([-+][0-9A-Za-z.\-]+)?$")


def normalize(version: str) -> str:
    """去掉首尾空白与 v 前缀。"""
    return version.strip().lstrip("v")


def is_valid(version: str) -> bool:
    """报告 version 是否是合法的版本号（不含 v 前缀）。"""
    return bool(SEMVER_RE.fullmatch(version))


def read_version(text: str) -> str | None:
    """从 config.yml 正文中读出 info.version，读不到时返回 None。"""
    match = VERSION_RE.search(text)
    return match.group(2) if match else None


def replace_version(text: str, version: str) -> tuple[str, int]:
    """把 config.yml 正文里的 info.version 换成 version，返回 (新正文, 替换次数)。"""
    return VERSION_RE.subn(rf"\g<1>{version}\g<3>", text, count=1)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    version = normalize(sys.argv[1])
    if not is_valid(version):
        print(f"非法版本号: {version}", file=sys.stderr)
        return 1

    text = CONFIG.read_text(encoding="utf-8")
    new_text, count = replace_version(text, version)
    if count == 0:
        print(f"未在 {CONFIG} 中找到 version 字段", file=sys.stderr)
        return 1

    CONFIG.write_text(new_text, encoding="utf-8")
    print(f"已将 {CONFIG.name} 的版本号设置为 {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
