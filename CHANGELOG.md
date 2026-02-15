## 0.0.6

- 新增：编辑器失焦（如切到终端、菜单、窗口失焦）时自动切换到中文输入法，可通过 imeContextSwitcher.switchToChineseOnEditorBlur 开关控制。
- 新增：启动时读取当前输入法编码（若非中文）作为英文目标输入法，可通过 imeContextSwitcher.captureInitialImeAsEnglish 控制。
- 修复：切换命令改为按目标模式取码，避免状态切换过程中的竞态导致的错误切换。

# 更新日志

## 0.0.5

- 设置页面文案本地化为中文，便于直接在扩展设置中理解各项配置。
- 新增可选开关 `imeContextSwitcher.enableInBlockComment`，可控制是否在 `/* */` 注释中自动切换到中文输入法。
- 保留并完善可选开关：
  - `imeContextSwitcher.enableInLineComment`
  - `imeContextSwitcher.enableInDoubleQuotedString`

## 0.0.4

- 支持在 `/* */` 注释中自动切换为中文输入法。
- 优化设置项说明，并同步更新文档内容。

## 0.0.3

- 新增在 `/* */` 注释中切换中文输入法的核心逻辑（后续版本增加可配置开关）。
- 打包发布 `0.0.3` 版本。

