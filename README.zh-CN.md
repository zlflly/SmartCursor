# SmartCursor（本地版）

> English version: [README.md](README.md)

这个扩展会在 C/C++ 中自动切换输入法：
- 在 `//` 注释内切换为中文输入法
- 在双引号字符串 `"..."` 内切换为中文输入法
- 其他位置切换为英文输入法

## 目录
- `SmartCursor/`

## 内置二进制（用于自包含 VSIX）
- 将 `im-select.exe` 放在：`SmartCursor/bin/im-select.exe`
- 扩展会基于安装目录解析 `imeContextSwitcher.imSelectPath`

默认编码：
- 中文：`2052`
- 英文：`1033`

如果你的机器使用不同编码，请修改：
- `imeContextSwitcher.chineseCode`
- `imeContextSwitcher.englishCode`

## 开发模式安装
1. 在 VS Code 中以独立文件夹方式打开 `SmartCursor`。
2. 按 `F5` 启动 Extension Development Host。
3. 在任意 C/C++ 文件中测试。

## 直接通过 VSIX 安装
1. 直接下载或使用仓库内已提供的 VSIX 文件（例如：`SmartCursor-0.0.1.vsix`）。
2. 在 VS Code 打开命令面板（`Ctrl+Shift+P`）。
3. 执行 `Extensions: Install from VSIX...`。
4. 选择 `.vsix` 文件并完成安装。

## 打包为 VSIX
1. 确保 `bin/im-select.exe` 存在。
2. 在 `SmartCursor` 目录运行 `vsce package`。
3. 安装生成的 `.vsix` 文件。

## 配置项
- `imeContextSwitcher.enabled`
- `imeContextSwitcher.enabledLanguageIds`
- `imeContextSwitcher.imSelectPath`
- `imeContextSwitcher.chineseCode`
- `imeContextSwitcher.englishCode`
- `imeContextSwitcher.enableInLineComment`
- `imeContextSwitcher.enableInDoubleQuotedString`
- `imeContextSwitcher.warnOnMissingBinary`
- `imeContextSwitcher.debug`
