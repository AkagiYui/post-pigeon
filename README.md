# Post Pigeon

[![Build](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml/badge.svg)](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Post Pigeon 是一个基于 Wails3 构建的 API 测试工具。

## 如何使用

### 方式一：下载预构建版本

前往 [Actions](https://github.com/AkagiYui/post-pigeon/actions) 页面，在最新的工作流运行记录中下载对应平台的构建产物。

### 方式二：从源码构建

1. 克隆仓库：

   ```bash
   git clone https://github.com/AkagiYui/post-pigeon.git
   cd post-pigeon
   ```

2. 构建应用：

   ```bash
   wails3 build
   ```

   构建完成后，可执行文件将位于 `bin/` 目录中。
