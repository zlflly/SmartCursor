# SmartCursor

> 智能输入法切换助手 - 根据代码上下文自动切换中英文输入法

[English](README.en.md)

## ✨ 核心功能

**自动切换输入法**
- 📝 注释和字符串中自动切换到中文
- 💻 代码区域自动切换到英文
- 🎯 状态栏实时显示当前输入法

**支持多种语言**
- C/C++、JavaScript、TypeScript
- Java、Go、Rust、C#、PHP
- Markdown（实验性）

**智能检测**
- 🔍 自动检测输入法编码
- 📦 模板字符串支持（JS/TS）
- ⚡ 性能缓存优化

## 🚀 快速开始

### 1. 安装
在 VS Code 扩展市场搜索 "SmartCursor" 或手动安装 `.vsix` 文件

### 2. 首次使用
打开命令面板（`Ctrl+Shift+P`），运行：
```
SmartCursor: 自动检测输入法编码
```
按提示切换输入法完成配置

### 3. 开始使用
打开支持的代码文件，光标移动时自动切换输入法

## ⚙️ 配置

### 基础配置
```json
{
  "imeContextSwitcher.enabled": true,
  "imeContextSwitcher.enabledLanguageIds": ["c", "cpp"],
  "imeContextSwitcher.chineseCode": "2052",
  "imeContextSwitcher.englishCode": "1033"
}
```

### 特性开关
```json
{
  // 默认启用
  "imeContextSwitcher.features.extendedLanguageSupport": true,
  "imeContextSwitcher.features.templateStringDetection": true,
  "imeContextSwitcher.features.performanceCache": true,

  // 实验性功能（默认关闭）
  "imeContextSwitcher.features.markdownSupport": false,
  "imeContextSwitcher.features.customRules": false
}
```

### 自定义规则（高级）
```json
{
  "imeContextSwitcher.customRules": [
    {
      "pattern": "TODO:",
      "mode": "chinese",
      "description": "TODO 注释使用中文"
    }
  ]
}
```

## 🎮 快捷操作

- **点击状态栏**：快速切换输入法
- **命令面板**：
  - `SmartCursor: 切换启用/禁用`
  - `SmartCursor: 切换到中文输入法`
  - `SmartCursor: 切换到英文输入法`
  - `SmartCursor: 自动检测输入法编码`

## 📋 使用场景

### C/C++ 代码
```cpp
// 这里可以输入中文注释 ✓
int main() {
    printf("字符串中也可以输入中文"); // ✓
    int count = 0; // 代码区域自动切换到英文 ✓
}
```

### JavaScript/TypeScript
```javascript
// 支持注释中的中文 ✓
const msg = `模板字符串中的中文`; // ✓
const result = `计算结果：${1 + 1}`; // ${} 内自动切换到英文 ✓
```

### Markdown（需启用）
```markdown
# 中文标题

这是一段中文内容，会自动切换到中文输入法。

\`\`\`javascript
// 代码块内自动切换到英文
const code = "example";
\`\`\`
```

## 🔧 系统要求

- **平台**：Windows（依赖 `im-select.exe`）
- **VS Code**：1.80.0 或更高版本

## 🐛 调试

启用调试日志：
```json
{
  "imeContextSwitcher.debug": true
}
```
查看输出面板（`Ctrl+Shift+U`）→ 选择 "SmartCursor"

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md)

## 📄 许可证

MIT License

## 🔗 链接

- [GitHub 仓库](https://github.com/zlflly/SmartCursor)
- [问题反馈](https://github.com/zlflly/SmartCursor/issues)
