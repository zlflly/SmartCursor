# SmartCursor v1.0.1

## 🎉 重大版本升级

从 v0.0.6 到 v1.0.1 的里程碑版本，带来大量新功能和改进。

---

## ✨ 核心新增功能

### 🔄 IME 状态轮询监控（v1.0.1 新增）
- 每秒自动查询当前输入法状态
- 即使外部手动切换输入法，状态栏也能实时同步
- 解决状态栏显示与实际输入法不一致的问题

### ⌨️ 状态栏输入法指示器
- 实时显示当前输入法状态（中文/英文）
- 点击状态栏可快速切换输入法
- 鼠标悬停显示详细提示

### 🌐 扩展语言支持
- 从 C/C++ 扩展到 **JavaScript, TypeScript, Java, Go, Rust, C#, PHP**
- 所有 C-like 语言共享相同的检测逻辑

### 📝 模板字符串支持
- JavaScript/TypeScript 模板字符串 `` `...` `` 中自动切换到中文
- 配置项：`enableInTemplateString`

### 🧙 智能输入法检测向导
- 新增命令：`SmartCursor: 自动检测输入法编码`
- 自动引导用户配置输入法编码
- 首次使用更加友好

### 🎯 自定义规则系统（实验性）
- 支持通过正则表达式自定义切换规则
- 配置示例：
```json
{
  "imeContextSwitcher.customRules": [
    {
      "pattern": "TODO:|FIXME:",
      "mode": "chinese"
    }
  ]
}
```

### 📄 Markdown 智能检测（实验性）
- 中文段落自动切换到中文
- 代码块自动切换到英文

---

## 🔧 主要改进

### 基础设施
- ✅ 增强日志系统（日志级别、时间戳、上下文信息）
- ✅ 性能监控（自动记录函数执行时间）
- ✅ 性能缓存（上下文分析结果缓存）
- ✅ 特性开关系统（支持实验性功能的独立控制）

### 用户体验
- ✅ 单引号字符串支持
- ✅ 退出时自动切换到中文
- ✅ 焦点切换优化
- ✅ 新增多个快捷命令

### Bug 修复
- 🐛 修复字符串中中文引号导致的语法错误

---

## 📊 版本对比

| 功能 | v0.0.6 | v1.0.1 |
|------|--------|--------|
| 支持语言 | 2 种 | 9 种 |
| 状态栏指示器 | ❌ | ✅ |
| IME 状态监控 | ❌ | ✅ |
| 模板字符串 | ❌ | ✅ |
| 自定义规则 | ❌ | ✅ |
| 智能检测向导 | ❌ | ✅ |
| 性能缓存 | ❌ | ✅ |

---

## 📦 安装

下载 `SmartCursor-1.0.1.vsix` 文件，在 VS Code 中通过"从 VSIX 安装"进行安装。

或使用命令行：
```bash
code --install-extension SmartCursor-1.0.1.vsix
```

---

## 🚀 快速开始

### 首次配置
1. 打开命令面板（Ctrl+Shift+P）
2. 输入 "SmartCursor: 自动检测输入法编码"
3. 按照提示完成配置

### 启用实验性功能
```json
{
  "imeContextSwitcher.features.markdownSupport": true,
  "imeContextSwitcher.features.customRules": true
}
```

---

## ⚠️ 已知问题

- 仅支持 Windows 平台
- 依赖 im-select.exe 工具
- 复杂语法可能误判

---

## 📝 完整更新日志

详见 [RELEASE_v1.0.1.md](https://github.com/zlflly/SmartCursor/blob/main/RELEASE_v1.0.1.md)

---

**享受 SmartCursor v1.0.1 带来的全新体验！** 🎉
