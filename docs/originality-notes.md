# Originality Notes

## Scope
This project implements automatic IME switching for coding contexts in VS Code.

## Clean-Room Constraints Used
- No source file content was copied from third-party extensions.
- No third-party binary module was imported into this codebase.
- Implementation reuses existing SmartCursor architecture and naming patterns.

## Independent Design Decisions
- Uses `im-select.exe` query/switch path as the primary mechanism.
- Same-IME fallback is implemented as an optional compatibility mode.
- Same-IME toggle shortcut is configurable (`shift`, `ctrl+space`, `shift+space`).
- Adds startup calibration for same-IME mode initialization.
- Adds switch protection window to avoid immediate status bounce.

## Compatibility Features Added
- `imeContextSwitcher.sameImeToggleShortcut`
- `imeContextSwitcher.switchProtectionMs`
- `imeContextSwitcher.promptSameImeInitialModeOnStartup`
- `imeContextSwitcher.sameImeInitialMode`

## Explicit Non-Goals
- No reuse of third-party native addon API contracts.
- No reuse of third-party class/module structure.
- No reuse of third-party UI text or docs wording.

## Evidence Pointers
- Core implementation: `extension.js`
- User settings contract: `package.json`
- Workspace opt-in example: `.vscode/settings.json`
