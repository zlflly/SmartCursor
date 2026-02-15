# SmartCursor

Chinese version: [README.zh-CN.md](README.zh-CN.md)

Automatically switches input method in C/C++ based on cursor context.

## 1. Current Features

- Platform: Windows only (depends on `im-select.exe`).
- Languages: `c`, `cpp` (configurable via `imeContextSwitcher.enabledLanguageIds`).
- Context rules:
  - Switch to Chinese IME inside `//` comments.
  - Switch to Chinese IME inside `/* ... */` comments.
  - Switch to Chinese IME inside double-quoted strings `"..."`.
  - Switch to English IME elsewhere.
- Optional toggles for line comments, block comments, and double-quoted strings.
- Default IME codes: Chinese `2052`, English `1033` (both configurable).

## 2. Known Issues

- Windows-only for now; other platforms are not implemented.
- Requires `im-select.exe`; switching fails if the binary is missing or path is wrong.
- Default language coverage is only C/C++; other language IDs must be configured manually.
- On VS Code exit, the extension does not guarantee restoring your previous IME state.
- Context detection uses lightweight parsing and may mis-detect complex cases (for example, C++ raw strings).
- It rescans text up to the cursor on editor changes, which may add overhead in very large files.

## 3. How It Works (Brief)

- Listens to VS Code events: active editor change, cursor movement, document change, and configuration change.
- Uses a short debounce (`50ms`) to reduce repeated work on bursty events.
- Detects whether the cursor is currently in comments or double-quoted strings.
- Maps detection result to target mode (Chinese/English), and only switches when mode changes.
- Runs `im-select.exe` via `execFile` with the configured IME code argument.
