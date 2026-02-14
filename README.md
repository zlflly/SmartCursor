# SmartCursor (Local)

This extension auto-switches IME in C/C++:
- Chinese IME inside `//` comments
- Chinese IME inside double-quoted strings `"..."`
- English IME elsewhere

## Folder
- `SmartCursor/`

## Bundled binary (for self-contained VSIX)
- Put `im-select.exe` at: `SmartCursor/bin/im-select.exe`
- The extension resolves `imeContextSwitcher.imSelectPath` relative to extension install path.

Default codes:
- Chinese: `2052`
- English: `1033`

If your machine uses different codes, change:
- `imeContextSwitcher.chineseCode`
- `imeContextSwitcher.englishCode`

## Install for development
1. Open `SmartCursor` as a standalone folder in VS Code.
2. Press `F5` to run Extension Development Host.
3. Test in any C/C++ file.

## Package as VSIX
1. Ensure `bin/im-select.exe` exists.
2. Run `vsce package` in `SmartCursor`.
3. Install generated `.vsix`.

## Settings
- `imeContextSwitcher.enabled`
- `imeContextSwitcher.enabledLanguageIds`
- `imeContextSwitcher.imSelectPath`
- `imeContextSwitcher.chineseCode`
- `imeContextSwitcher.englishCode`
- `imeContextSwitcher.enableInLineComment`
- `imeContextSwitcher.enableInDoubleQuotedString`
- `imeContextSwitcher.warnOnMissingBinary`
- `imeContextSwitcher.debug`
