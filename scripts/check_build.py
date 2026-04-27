#!/usr/bin/env python3
"""
检查 commit 是否需要触发构建。

根据 commit message 判断是否包含功能性变更（不以 docs: 或 style: 开头）。
如果是功能性变更，输出 should-build=true，否则输出 false。

用法：
  python3 scripts/check_build.py '<JSON 格式的 commits 数组>'
  echo '<JSON>' | python3 scripts/check_build.py

在 GitHub Actions 中：
  - name: 检查 commit 是否需要构建
    run: python3 scripts/check_build.py '${{ toJSON(github.event.commits) }}'
"""

import json
import os
import sys


def should_build(commits: list[dict]) -> bool:
    """判断 commits 中是否包含需要构建的功能性变更。"""
    for commit in commits:
        # 取 commit message 的第一行作为标题
        title = commit.get("message", "").split("\n")[0]
        if title and not title.startswith(("docs:", "style:")):
            print(f"发现功能性 commit: {title}", file=sys.stderr)
            return True
    return False


def main() -> int:
    # 从命令行参数或 stdin 读取 JSON
    if len(sys.argv) > 1:
        commits = json.loads(sys.argv[1])
    else:
        commits = json.load(sys.stdin)

    result = should_build(commits)
    output = f"should-build={str(result).lower()}"

    # 输出到 stdout（方便调试）
    print(output)

    # 写入 GITHUB_OUTPUT（GitHub Actions 环境变量）
    github_output = os.environ.get("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a") as f:
            f.write(output + "\n")

    # 有功能性变更返回 0，否则返回 1
    return 0 if result else 1


if __name__ == "__main__":
    sys.exit(main())
