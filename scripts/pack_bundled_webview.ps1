<#
.SYNOPSIS
    打包「内置 WebView2 内核」的两个 Windows 产物。

.DESCRIPTION
    产出两件东西，都在 -OutDir 下：

      <AppName>-windows-<Arch>-fixedwebview.zip            绿色免安装包
      <AppName>-windows-<Arch>-fixedwebview-installer.exe   NSIS 安装包

    面向的是装不上、也留不住 Evergreen WebView2 运行时的机器：精简版 / Ghost 版
    系统、网吧还原卡与无盘环境、离线内网机。内核跟着应用目录走，不装、不写注册表、
    不需要管理员权限。

    应用二进制与常规版完全是同一个：内核选择在运行期做（见
    internal/platform/webview.go 的 BundledWebviewPath），目录里有 webview2\ 就用它，
    没有就退回系统安装的那份。所以这里不重新编译，只是换一种打包方式。

.PARAMETER RuntimeDir
    WebView2 Fixed Version 运行时目录，里面直接放着 msedgewebview2.exe。
    由 .github/actions/webview2-runtime 准备。

.EXAMPLE
    pwsh -File scripts/pack_bundled_webview.ps1 -RuntimeDir D:\wv2 -AppName PostPigeon -Arch amd64
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RuntimeDir,
    [Parameter(Mandatory = $true)][string]$AppName,
    [string]$Arch = 'amd64',
    [string]$BinDir = 'bin',
    [string]$OutDir = 'dist-fixedwebview'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ---- 前置检查 ------------------------------------------------------------

$hostExe = Join-Path $RuntimeDir 'msedgewebview2.exe'
if (-not (Test-Path -LiteralPath $hostExe)) {
    # 这个目录会被原样交给 Wails 的 WebviewBrowserPath，那边找不到宿主进程就直接
    # 创建环境失败，应用起不来只留一个看不懂的 HRESULT。宁可在这里炸。
    throw "运行时目录里没有 msedgewebview2.exe: $RuntimeDir"
}

$appExe = Join-Path $BinDir "$AppName.exe"
if (-not (Test-Path -LiteralPath $appExe)) {
    throw "找不到应用二进制: $appExe（应先跑 wails3 package）"
}

if (-not (Get-Command 7z -ErrorAction SilentlyContinue)) {
    # 不退回 Compress-Archive：运行时有二十多万个小文件，PowerShell 自带的压缩
    # 在这个量级上要跑十几分钟。GitHub 的 windows runner 一直预装 7-Zip，
    # 真没有的话应该修环境，而不是让每次构建慢十倍。
    throw '未找到 7z，无法打包绿色版'
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$outFull = (Resolve-Path $OutDir).Path

# ---- 绿色免安装包 --------------------------------------------------------

# 压缩包里保持单个顶层目录，用户解压出来是干净的一个文件夹而不是一地文件。
$staging = Join-Path ([System.IO.Path]::GetTempPath()) "pp-portable-$([guid]::NewGuid().ToString('N'))"
$appDir = Join-Path $staging $AppName
New-Item -ItemType Directory -Force -Path $appDir | Out-Null

Write-Host "组装绿色包: $appDir"
Copy-Item -LiteralPath $appExe -Destination $appDir
Copy-Item -LiteralPath $RuntimeDir -Destination (Join-Path $appDir 'webview2') -Recurse

# 目标用户多半是「网管把文件夹丢进镜像」的场景，一份说明能省掉大半的提问。
$readme = @"
$AppName 绿色版（内置浏览器内核）
================================

适用于：装不上或留不住 WebView2 运行时的机器
        —— 精简版 / Ghost 版 Windows、网吧还原卡与无盘系统、离线内网机。

使用方法
--------
1. 把整个 $AppName 文件夹解压到任意位置，双击 $AppName.exe 即可。
2. 不需要安装，不写注册表，不需要管理员权限。
3. 卸载就是删掉这个文件夹。

注意事项
--------
* 请勿删除 webview2 文件夹：那是应用自带的浏览器内核，删了就打不开了。
* 请勿解压到 C:\Program Files 下。那里普通用户没有写权限，应用内的自动更新
  会因为换不掉自己而失败。放桌面、D 盘或软件盘都可以。
* 应用数据（配置、历史、数据库）仍然存放在系统的用户目录下，与安装版一致，
  不随这个文件夹移动。还原卡环境下重启后会被一并还原。
* 自动更新只替换 $AppName.exe，webview2 文件夹不会跟着更新。内核需要升级时，
  请到发布页重新下载一次绿色版。

内核版本、来源与目录可以在 应用内「设置 → 关于」里查看。
"@
# 用 UTF-8 with BOM：目标机器上多半是用记事本打开的，
# 老版本记事本没有 BOM 会把中文当 GBK 解出乱码。
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText((Join-Path $appDir '使用说明.txt'), $readme, $utf8Bom)

$zipPath = Join-Path $outFull "$AppName-windows-$Arch-fixedwebview.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

# -tzip 而不是 7z 格式：目标机器上大概率没装解压软件，而 .zip 是资源管理器
# 唯一原生认识的格式。-mx=5 是这堆内容上体积与耗时的拐点，调到 9 只小几 MB
# 却要多花好几分钟。
Write-Host "压缩绿色包 -> $zipPath"
& 7z a -tzip -mx=5 -bso0 -bsp0 $zipPath (Join-Path $staging $AppName) | Out-Null
if ($LASTEXITCODE -ne 0) { throw "7z 打包失败，退出码 $LASTEXITCODE" }

Remove-Item -Recurse -Force $staging

# ---- NSIS 安装包 ---------------------------------------------------------

# 走 Taskfile 而不是直接敲 makensis：版本号剥后缀、架构对应的 ARG_WAILS_*_BINARY
# 这些细节都在那边，两处各写一遍迟早对不上。
Write-Host '构建内置内核版 NSIS 安装包'
& wails3 task windows:create:nsis:installer:bundled "WEBVIEW2_RUNTIME_DIR=$RuntimeDir"
if ($LASTEXITCODE -ne 0) { throw "NSIS 打包失败，退出码 $LASTEXITCODE" }

# project.nsi 里 OutFile 的命名规则：<项目名>-<架构>-fixedwebview-installer.exe
$installer = Join-Path $BinDir "$AppName-$Arch-fixedwebview-installer.exe"
if (-not (Test-Path -LiteralPath $installer)) {
    throw "没有产出内置内核版安装包: $installer"
}
Copy-Item -LiteralPath $installer -Destination (Join-Path $outFull "$AppName-windows-$Arch-fixedwebview-installer.exe") -Force

# ---- 汇总 ----------------------------------------------------------------

Get-ChildItem $outFull -File | ForEach-Object {
    Write-Host ("{0,-56} {1,8:N0} MB" -f $_.Name, ($_.Length / 1MB))
}
