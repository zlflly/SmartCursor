# SmartCursor

[English](#english) | [简体中文](#简体中文) | [中文文档](README.zh-CN.md)

## English

This extension auto-switches IME in C/C++:

- Chinese IME inside `//` comments
- Chinese IME inside double-quoted strings `"..."`
- English IME elsewhere

## Platform support

- Currently only supports Windows.
- Development and verification were done on Windows 11.
- Other platforms are not verified yet and may not work.
- PRs are welcome for cross-platform support.

## Known issue

- If you leave a coding area and then close VS Code, your input method may stay in English.
- Temporary workaround: press `Win + Space` to switch back to your previous input method.

## Folder

- `SmartCursor/`

## Bundled binary (for self-contained VSIX)

- Put `im-select.exe` at: `SmartCursor/bin/im-select.exe`

Input method default codes:

- These values are IME/language IDs used by `im-select.exe` when the extension switches input methods.
- Chinese default `2052` usually maps to Simplified Chinese (zh-CN).
- English default `1033` usually maps to English (en-US).
- They are safe defaults, but not universal. If your system uses different IDs, switching may fail or switch to the wrong IME.

How to confirm IDs on your machine:

1. Run `im-select.exe` in terminal. It returns the ID of the current input method.
2. Manually switch to your Chinese input method, run `im-select.exe`, and record the number.
3. Manually switch to your English input method, run `im-select.exe`, and record the number.
4. Set:
- `imeContextSwitcher.chineseCode` = your Chinese IME ID
- `imeContextSwitcher.englishCode` = your English IME ID

## Install for development

1. Open `SmartCursor` as a standalone folder in VS Code.
2. Press `F5` to run Extension Development Host.
3. Test in any C/C++ file.

## Install from VSIX (direct)

1. Download or use the bundled VSIX file (for example: `SmartCursor-0.0.1.vsix`).
2. In VS Code, open Command Palette (`Ctrl+Shift+P`).
3. Run `Extensions: Install from VSIX...`.
4. Select the `.vsix` file and finish installation.

## 简体中文

这个扩展会在 C/C++ 中自动切换输入法：

- 在 `//` 注释内切换为中文输入法
- 在双引号字符串 `"..."` 内切换为中文输入法
- 其他位置切换为英文输入法

## 平台支持

- 目前仅支持 Windows。
- 当前在 Windows 11 开发机上完成开发和验证。
- 其他平台暂未验证，不能保证可用。
- 欢迎提交 PR 一起完善跨平台支持。

## 已知问题

- 离开编码区域后直接关闭 VS Code，输入法可能仍停留在英文状态。
- 临时恢复方式：按 `Win + Space` 切回你之前的输入法。

## 目录

- `SmartCursor/`

## 内置二进制（用于自包含 VSIX）

- 将 `im-select.exe` 放在：`SmartCursor/bin/im-select.exe`

输入法默认编码：

- 这些值是扩展调用 `im-select.exe` 切换输入法时使用的输入法/语言 ID。
- 中文默认 `2052`，通常对应简体中文（zh-CN）。
- 英文默认 `1033`，通常对应英文（en-US）。
- 这是通用默认值，不一定适用于所有机器。如果你的系统 ID 不同，可能会切换失败或切到错误输入法。

如何确认你机器上的实际 ID：

1. 在终端运行 `im-select.exe`，它会返回当前输入法的 ID。
2. 手动切到中文输入法后，再运行 `im-select.exe`，记录该数字。
3. 手动切到英文输入法后，再运行 `im-select.exe`，记录该数字。
4. 将配置改为：
- `imeContextSwitcher.chineseCode` = 你的中文输入法 ID
- `imeContextSwitcher.englishCode` = 你的英文输入法 ID

## 开发模式安装

1. 在 VS Code 中以独立文件夹方式打开 `SmartCursor`。
2. 按 `F5` 启动 Extension Development Host。
3. 在任意 C/C++ 文件中测试。

## 直接通过 VSIX 安装

1. 直接下载或使用仓库内已提供的 VSIX 文件（例如：`SmartCursor-0.0.1.vsix`）。
2. 在 VS Code 打开命令面板（`Ctrl+Shift+P`）。
3. 执行 `Extensions: Install from VSIX...`。
4. 选择 `.vsix` 文件并完成安装。



