# 更新日志

## 0.1.0

### 基础设施
- 新增：增强日志系统，支持 DEBUG/INFO/WARN/ERROR 四个级别
- 新增：性能监控功能，自动记录慢操作（>100ms）
- 新增：特性开关系统，所有新功能可独立启用/禁用

### 语言支持
- 新增：扩展语言支持，现支持 JavaScript、TypeScript、Java、Go、Rust、C#、PHP
- 新增：模板字符串支持（JavaScript/TypeScript），正确处理 \`${}\` 表达式
- 新增：Markdown 智能检测，代码块使用英文，中文段落使用中文（实验性，默认关闭）

### 用户交互
- 新增：状态栏点击切换输入法功能
- 新增：4个新命令（切换启用/禁用、切换到中文、切换到英文、切换输入法）
- 新增：智能IME检测向导，自动检测中英文输入法编码

### 性能优化
- 新增：上下文分析结果缓存，显著提升大文件性能
- 优化：文档变化时自动清除缓存

### 高级功能
- 新增：自定义规则系统，支持用户定义正则表达式规则（实验性，默认关闭）
- 新增：详细的调试日志和错误报告

### 配置项
- 新增：`enableInTemplateString` - 模板字符串中启用中文
- 新增：`customRules` - 自定义规则列表
- 新增：6个特性开关配置项

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

