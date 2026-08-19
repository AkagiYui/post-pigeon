#!/usr/bin/env python3
"""
把版本号写入 build/config.yml 的 info.version 字段。

版本号的唯一真实来源是 git tag：发版工作流在构建前调用本脚本，
Taskfile 的 APP_VERSION 会读取该字段并经 ldflags 注入 config.Version。

用法：
  python3 scripts/set_version.py 1.2.0
"""

import pathlib
import re
import sys

CONFIG = pathlib.Path(__file__).resolve().parent.parent / "build" / "config.yml"

# 匹配 `  version: "0.0.1" # 注释` 形式，仅替换引号内的值，保留缩进与行尾注释
VERSION_RE = re.compile(r'^(\s+version:\s*")([^"]*)(".*)$', re.MULTILINE)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    version = sys.argv[1].lstrip("v").strip()
    if not re.fullmatch(r"[0-9]+(\.[0-9]+)*([-+][0-9A-Za-z.\-]+)?", version):
        print(f"非法版本号: {version}", file=sys.stderr)
        return 1

    text = CONFIG.read_text(encoding="utf-8")
    new_text, count = VERSION_RE.subn(rf'\g<1>{version}\g<3>', text, count=1)
    if count == 0:
        print(f"未在 {CONFIG} 中找到 version 字段", file=sys.stderr)
        return 1

    CONFIG.write_text(new_text, encoding="utf-8")
    print(f"已将 {CONFIG.name} 的版本号设置为 {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
