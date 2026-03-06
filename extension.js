const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

let currentMode = "unknown";
let timer = null;
let focusMonitorTimer = null;
let focusCheckInFlight = false;
let lastEditorTextFocus = null;
let imeStatusMonitorTimer = null;
let imeStatusCheckInFlight = false;
let output = null;
let extensionPath = "";
let hasWarnedMissingBinary = false;
let detectedEnglishCode = null;
let statusBarItem = null;
let lastSwitchTimestamp = 0;
let lastSwitchStrategy = "none";

// Log levels for enhanced logging
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

let currentLogLevel = LogLevel.DEBUG;
const performanceMetrics = new Map();

// Performance cache (Phase 3.2)
const contextAnalysisCache = new Map();

function getConfig() {
  return vscode.workspace.getConfiguration("imeContextSwitcher");
}

// Feature flag system
function isFeatureEnabled(featureName) {
  const cfg = getConfig();
  const featureKey = `features.${featureName}`;
  const enabled = cfg.get(featureKey, false);

  if (enabled) {
    logDebug(`Feature enabled: ${featureName}`);
  }

  return enabled;
}

// Enhanced logging with levels and context
function log(message, level = LogLevel.DEBUG, context = {}) {
  const cfg = getConfig();
  if (!cfg.get("debug", false)) {
    return;
  }

  if (level < currentLogLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const levelName = Object.keys(LogLevel).find(k => LogLevel[k] === level);
  const contextStr = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : '';

  const fullMessage = `[${timestamp}] [${levelName}] ${message}${contextStr}`;

  if (!output) {
    output = vscode.window.createOutputChannel("SmartCursor");
  }
  output.appendLine(fullMessage);
}

// Convenience logging functions
function logDebug(message, context = {}) {
  log(message, LogLevel.DEBUG, context);
}

function logInfo(message, context = {}) {
  log(message, LogLevel.INFO, context);
}

function logWarn(message, context = {}) {
  log(message, LogLevel.WARN, context);
}

function logError(message, context = {}) {
  log(message, LogLevel.ERROR, context);
}

// Performance monitoring
function perfStart(label) {
  performanceMetrics.set(label, Date.now());
}

function perfEnd(label) {
  const startTime = performanceMetrics.get(label);
  if (!startTime) {
    return;
  }

  const duration = Date.now() - startTime;
  logDebug(`Performance: ${label}`, { duration: `${duration}ms` });

  if (duration > 100) {
    logWarn(`Slow operation: ${label}`, { duration: `${duration}ms` });
  }

  performanceMetrics.delete(label);
}

function updateStatusBar() {
  if (!statusBarItem) {
    return;
  }
  const cfg = getConfig();
  if (!cfg.get("enabled", true)) {
    statusBarItem.hide();
    return;
  }

  if (currentMode === "chinese") {
    statusBarItem.text = "$(keyboard) 中";
    statusBarItem.tooltip = "当前输入法：中文\n点击切换到英文";
  } else if (currentMode === "english") {
    statusBarItem.text = "$(keyboard) En";
    statusBarItem.tooltip = "当前输入法：英文\n点击切换到中文";
  } else {
    statusBarItem.text = "$(keyboard) --";
    statusBarItem.tooltip = "输入法状态未知";
  }
  statusBarItem.show();
}

// Command handlers (Phase 2.2)
function commandToggleEnabled() {
  const cfg = getConfig();
  const currentEnabled = cfg.get("enabled", true);
  cfg.update("enabled", !currentEnabled, vscode.ConfigurationTarget.Global);

  logInfo(`Extension ${!currentEnabled ? 'enabled' : 'disabled'}`);
  vscode.window.showInformationMessage(
    `SmartCursor: ${!currentEnabled ? '已启用' : '已禁用'}`
  );

  updateStatusBar();
}

function commandSwitchToChinese() {
  logInfo(`Manual switch to Chinese via command`);
  switchToMode("chinese", true);
}

function commandSwitchToEnglish() {
  logInfo(`Manual switch to English via command`);
  switchToMode("english", true);
}

function commandToggleIme() {
  // Toggle between Chinese and English
  const nextMode = currentMode === "chinese" ? "english" : "chinese";
  logInfo(`Toggling IME via status bar click`, { from: currentMode, to: nextMode });
  switchToMode(nextMode, true);
}

// Smart IME detection wizard (Phase 2.3)
async function commandDetectImeCodes() {
  const cfg = getConfig();
  const command = cfg.get("imSelectPath", "bin/im-select.exe");
  const exePath = resolveExePath(command);

  // Check if im-select exists
  if (!fs.existsSync(exePath)) {
    vscode.window.showErrorMessage(
      `SmartCursor: 找不到 im-select.exe，请先配置 imeContextSwitcher.imSelectPath`
    );
    return;
  }

  logInfo(`Starting IME detection wizard`);

  // Step 1: Detect English IME
  const englishAction = await vscode.window.showInformationMessage(
    'SmartCursor: 请切换到您的英文输入法，然后点击"确定"',
    { modal: true },
    "确定",
    "取消"
  );

  if (englishAction !== "确定") {
    logInfo(`IME detection cancelled by user`);
    return;
  }

  const englishCode = await queryCurrentImeCode(command);
  if (!englishCode) {
    vscode.window.showErrorMessage(
      `SmartCursor: 无法检测到英文输入法编码，请检查 im-select 是否正常工作`
    );
    logError(`Failed to detect English IME code`);
    return;
  }

  logInfo(`Detected English IME code`, { code: englishCode });

  // Step 2: Detect Chinese IME
  const chineseAction = await vscode.window.showInformationMessage(
    'SmartCursor: 请切换到您的中文输入法，然后点击"确定"',
    { modal: true },
    "确定",
    "取消"
  );

  if (chineseAction !== "确定") {
    logInfo(`IME detection cancelled by user at Chinese step`);
    return;
  }

  const chineseCode = await queryCurrentImeCode(command);
  if (!chineseCode) {
    vscode.window.showErrorMessage(
      `SmartCursor: 无法检测到中文输入法编码，请检查 im-select 是否正常工作`
    );
    logError(`Failed to detect Chinese IME code`);
    return;
  }

  logInfo(`Detected Chinese IME code`, { code: chineseCode });

  const useShiftWithinChineseIme = cfg.get("useShiftWithinChineseIme", false);
  // Validate that the codes are different unless Shift fallback is explicitly enabled
  if (englishCode === chineseCode) {
    if (useShiftWithinChineseIme) {
      await cfg.update("englishCode", englishCode, vscode.ConfigurationTarget.Global);
      await cfg.update("chineseCode", chineseCode, vscode.ConfigurationTarget.Global);
      detectedEnglishCode = englishCode;
      await cfg.update("sameImeInitialMode", "unknown", vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `SmartCursor: 中英文编码相同（${englishCode}），已启用同输入法 Shift 兼容切换模式。`
      );
      logInfo(`IME detection completed with same-code Shift fallback`, { code: englishCode });
      return;
    }
    vscode.window.showWarningMessage(
      `SmartCursor: 检测到的中英文输入法编码相同（${englishCode}）。如需支持同输入法内 Shift 中英切换，请开启 imeContextSwitcher.useShiftWithinChineseIme。`
    );
    logWarn(`English and Chinese IME codes are identical`, { code: englishCode });
    return;
  }

  // Step 3: Save the detected codes
  await cfg.update("englishCode", englishCode, vscode.ConfigurationTarget.Global);
  await cfg.update("chineseCode", chineseCode, vscode.ConfigurationTarget.Global);

  // Update the detected English code for runtime use
  detectedEnglishCode = englishCode;

  vscode.window.showInformationMessage(
    `SmartCursor: 输入法编码检测成功！\n英文: ${englishCode}\n中文: ${chineseCode}`
  );

  logInfo(`IME detection completed successfully`, {
    englishCode,
    chineseCode
  });
}

function resolveExePath(command) {
  return path.isAbsolute(command) ? command : path.join(extensionPath, command);
}

function isEscaped(text, index) {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
}

function findLineCommentStart(beforeCursor) {
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < beforeCursor.length; i++) {
    const ch = beforeCursor[i];
    
    // Check for string delimiters
    if (ch === '"' && !isEscaped(beforeCursor, i)) {
      inDouble = !inDouble;
      continue;
    }
    if (ch === "'" && !isEscaped(beforeCursor, i)) {
      inSingle = !inSingle;
      continue;
    }
    
    // Check for C-style line comment
    if (!inDouble && !inSingle && ch === "/" && i + 1 < beforeCursor.length && beforeCursor[i + 1] === "/") {
      return i;
    }
    
    // Check for Python-style line comment
    if (!inDouble && !inSingle && ch === "#") {
      return i;
    }
  }
  return -1;
}

function isInsideDoubleQuotedString(beforeCursor) {
  let inDouble = false;
  for (let i = 0; i < beforeCursor.length; i++) {
    const ch = beforeCursor[i];
    if (ch === '"' && !isEscaped(beforeCursor, i)) {
      inDouble = !inDouble;
    }
  }
  return inDouble;
}

// Phase 3.2: Cache management
function getCacheKey(document, position) {
  return `${document.uri.toString()}:${position.line}:${position.character}`;
}

function clearCacheForDocument(documentUri) {
  const uriString = documentUri.toString();
  let clearedCount = 0;

  for (const key of contextAnalysisCache.keys()) {
    if (key.startsWith(uriString)) {
      contextAnalysisCache.delete(key);
      clearedCount++;
    }
  }

  if (clearedCount > 0) {
    logDebug(`Cleared cache for document`, { uri: uriString, entries: clearedCount });
  }
}

function analyzeContextUntilPosition(document, position) {
  // Phase 3.2: Check cache first if feature is enabled
  if (isFeatureEnabled("performanceCache")) {
    const cacheKey = getCacheKey(document, position);
    const cached = contextAnalysisCache.get(cacheKey);

    if (cached) {
      logDebug(`Cache hit for context analysis`, {
        line: position.line,
        character: position.character
      });
      return cached;
    }
  }

  perfStart('analyzeContextUntilPosition');
  const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

  let inDouble = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inTemplate = false; // Phase 3.1: Template string support
  let templateExpressionDepth = 0; // Track nested ${} expressions
  let inTripleDouble = false; // Python triple double quotes
  let inTripleSingle = false; // Python triple single quotes

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    const nextNext = text[i + 2];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inDouble) {
      if (ch === '"' && !isEscaped(text, i)) {
        inDouble = false;
      }
      continue;
    }

    if (inSingle) {
      if (ch === "'" && !isEscaped(text, i)) {
        inSingle = false;
      }
      continue;
    }

    if (inTripleDouble) {
      if (ch === '"' && next === '"' && nextNext === '"' && !isEscaped(text, i)) {
        inTripleDouble = false;
        i += 2;
      }
      continue;
    }

    if (inTripleSingle) {
      if (ch === "'" && next === "'" && nextNext === "'" && !isEscaped(text, i)) {
        inTripleSingle = false;
        i += 2;
      }
      continue;
    }

    // Phase 3.1: Template string handling
    if (inTemplate) {
      // Check for embedded expression start
      if (ch === "$" && next === "{" && !isEscaped(text, i)) {
        templateExpressionDepth++;
        i++; // Skip the '{'
        continue;
      }

      // Check for embedded expression end
      if (templateExpressionDepth > 0 && ch === "}") {
        templateExpressionDepth--;
        continue;
      }

      // Check for template string end (only if not in embedded expression)
      if (templateExpressionDepth === 0 && ch === "`" && !isEscaped(text, i)) {
        inTemplate = false;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (ch === '"' && !isEscaped(text, i)) {
      // Check for triple double quotes
      if (next === '"' && nextNext === '"') {
        inTripleDouble = true;
        i += 2;
      } else {
        inDouble = true;
      }
      continue;
    }

    if (ch === "'" && !isEscaped(text, i)) {
      // Check for triple single quotes
      if (next === "'" && nextNext === "'") {
        inTripleSingle = true;
        i += 2;
      } else {
        inSingle = true;
      }
      continue;
    }

    // Phase 3.1: Template string start
    if (ch === "`" && !isEscaped(text, i)) {
      inTemplate = true;
    }
  }

  const result = {
    inBlockComment,
    inDoubleString: inDouble || inTripleDouble,
    inSingleString: inSingle || inTripleSingle,
    inTemplateString: inTemplate && templateExpressionDepth === 0, // Only true if not in ${}
  };

  perfEnd('analyzeContextUntilPosition');

  // Phase 3.2: Store in cache if feature is enabled
  if (isFeatureEnabled("performanceCache")) {
    const cacheKey = getCacheKey(document, position);
    contextAnalysisCache.set(cacheKey, result);
    logDebug(`Cached context analysis`, {
      line: position.line,
      character: position.character,
      cacheSize: contextAnalysisCache.size
    });
  }

  return result;
}

// Phase 4.1: Markdown context detection
function detectMarkdownContext(editor) {
  const position = editor.selection.active;
  const document = editor.document;
  const currentLine = position.line;

  // Check if we're in a code block
  let inCodeBlock = false;
  let codeBlockFenceCount = 0;

  // Scan from start to current line to detect code blocks
  for (let i = 0; i <= currentLine; i++) {
    const lineText = document.lineAt(i).text;
    const trimmed = lineText.trim();

    // Check for fenced code block (``` or ~~~)
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      codeBlockFenceCount++;
    }
  }

  // If odd number of fences, we're inside a code block
  inCodeBlock = codeBlockFenceCount % 2 === 1;

  if (inCodeBlock) {
    logDebug(`In Markdown code block, using English`);
    return false; // Use English in code blocks
  }

  // Check for indented code block (4 spaces or 1 tab at line start)
  const currentLineText = document.lineAt(currentLine).text;
  if (currentLineText.startsWith("    ") || currentLineText.startsWith("\t")) {
    // Check if previous line is also indented or empty (part of code block)
    if (currentLine > 0) {
      const prevLineText = document.lineAt(currentLine - 1).text;
      const prevTrimmed = prevLineText.trim();
      if (prevTrimmed === "" || prevLineText.startsWith("    ") || prevLineText.startsWith("\t")) {
        logDebug(`In Markdown indented code block, using English`);
        return false; // Use English in indented code blocks
      }
    }
  }

  // Not in code block, check if current paragraph contains Chinese
  // Scan backwards to find paragraph start
  let paragraphStart = currentLine;
  for (let i = currentLine - 1; i >= 0; i--) {
    const lineText = document.lineAt(i).text.trim();
    if (lineText === "") {
      paragraphStart = i + 1;
      break;
    }
    if (i === 0) {
      paragraphStart = 0;
    }
  }

  // Scan forwards to find paragraph end
  let paragraphEnd = currentLine;
  for (let i = currentLine + 1; i < document.lineCount; i++) {
    const lineText = document.lineAt(i).text.trim();
    if (lineText === "") {
      paragraphEnd = i - 1;
      break;
    }
    if (i === document.lineCount - 1) {
      paragraphEnd = i;
    }
  }

  // Get paragraph text
  let paragraphText = "";
  for (let i = paragraphStart; i <= paragraphEnd; i++) {
    paragraphText += document.lineAt(i).text + "\n";
  }

  // Check if paragraph contains Chinese characters
  const hasChinese = /[\u4e00-\u9fa5]/.test(paragraphText);

  if (hasChinese) {
    logDebug(`Markdown paragraph contains Chinese, using Chinese`);
    return true;
  }

  logDebug(`Markdown paragraph has no Chinese, using English`);
  return false;
}

// Phase 4.2: Custom rules system
function matchCustomRules(editor) {
  const cfg = getConfig();
  const customRules = cfg.get("customRules", []);

  if (!Array.isArray(customRules) || customRules.length === 0) {
    return null; // No rules defined
  }

  const position = editor.selection.active;
  const document = editor.document;
  const lineText = document.lineAt(position.line).text;
  const beforeCursor = lineText.slice(0, position.character);

  // Try to match each rule in order
  for (let i = 0; i < customRules.length; i++) {
    const rule = customRules[i];

    // Validate rule structure
    if (!rule || typeof rule !== "object") {
      logWarn(`Invalid custom rule at index ${i}: not an object`, { rule });
      continue;
    }

    if (!rule.pattern || typeof rule.pattern !== "string") {
      logWarn(`Invalid custom rule at index ${i}: missing or invalid pattern`, { rule });
      continue;
    }

    if (!rule.mode || (rule.mode !== "chinese" && rule.mode !== "english")) {
      logWarn(`Invalid custom rule at index ${i}: invalid mode`, { rule });
      continue;
    }

    // Try to create regex and match
    try {
      const regex = new RegExp(rule.pattern);
      if (regex.test(beforeCursor)) {
        logInfo(`Custom rule matched`, {
          index: i,
          pattern: rule.pattern,
          mode: rule.mode,
          description: rule.description || "No description"
        });
        return rule.mode === "chinese";
      }
    } catch (err) {
      logError(`Invalid regex in custom rule at index ${i}`, {
        pattern: rule.pattern,
        error: err.message
      });
      continue;
    }
  }

  return null; // No rules matched
}

function detectShouldUseChinese(editor) {
  const cfg = getConfig();
  const languageId = editor.document.languageId;

  // Phase 4.2: Custom rules have highest priority
  if (isFeatureEnabled("customRules")) {
    const customResult = matchCustomRules(editor);
    if (customResult !== null) {
      return customResult;
    }
  }

  // Phase 4.1: Markdown support
  if (isFeatureEnabled("markdownSupport") && languageId === "markdown") {
    return detectMarkdownContext(editor);
  }

  let enabledLangs = cfg.get("enabledLanguageIds", ["c", "cpp"]);

  // Extended language support (Phase 2.1)
  if (isFeatureEnabled("extendedLanguageSupport")) {
    const extendedLangs = ["javascript", "typescript", "java", "go", "rust", "csharp", "php"];
    // Merge with user-configured languages, avoiding duplicates
    enabledLangs = [...new Set([...enabledLangs, ...extendedLangs])];
    logDebug(`Extended language support active`, { languages: enabledLangs });
  }

  if (!enabledLangs.includes(languageId)) {
    return false;
  }

  const position = editor.selection.active;
  const lineText = editor.document.lineAt(position.line).text;
  const beforeCursor = lineText.slice(0, position.character);
  const context = analyzeContextUntilPosition(editor.document, position);

  if (cfg.get("enableInLineComment", true)) {
    const commentStart = findLineCommentStart(beforeCursor);
    if (commentStart >= 0 && position.character > commentStart) {
      return true;
    }
  }

  if (cfg.get("enableInBlockComment", true)) {
    if (context.inBlockComment) {
      return true;
    }
  }

  if (cfg.get("enableInDoubleQuotedString", true)) {
    if (context.inDoubleString || isInsideDoubleQuotedString(beforeCursor)) {
      return true;
    }
  }

  if (cfg.get("enableInSingleQuotedString", false)) {
    if (context.inSingleString) {
      return true;
    }
  }

  // Phase 3.1: Template string support (JavaScript/TypeScript)
  if (isFeatureEnabled("templateStringDetection")) {
    if (cfg.get("enableInTemplateString", true)) {
      if (context.inTemplateString) {
        logDebug(`In template string, switching to Chinese`);
        return true;
      }
    }
  }

  return false;
}

function getSwitchProtectionMs() {
  const cfg = getConfig();
  const raw = Number(cfg.get("switchProtectionMs", 350));
  if (!Number.isFinite(raw)) {
    return 350;
  }
  return Math.max(0, Math.min(5000, Math.floor(raw)));
}

function markRecentSwitch(mode, strategy) {
  lastSwitchTimestamp = Date.now();
  lastSwitchStrategy = strategy;
  logDebug("Recorded switch dispatch", { mode, strategy, protectionMs: getSwitchProtectionMs() });
}

function isWithinSwitchProtectionWindow() {
  const protectionMs = getSwitchProtectionMs();
  if (protectionMs <= 0) {
    return false;
  }
  return Date.now() - lastSwitchTimestamp < protectionMs;
}

function getSameImeToggleShortcut() {
  const cfg = getConfig();
  return String(cfg.get("sameImeToggleShortcut", "shift")).toLowerCase();
}

function buildShortcutPowerShellScript(shortcut) {
  const prefix = "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class K{[DllImport(\"user32.dll\")]public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);}';";
  if (shortcut === "ctrl+space") {
    return `${prefix} [K]::keybd_event(0x11,0,0,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x20,0,0,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x20,0,2,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x11,0,2,0)`;
  }
  if (shortcut === "shift+space") {
    return `${prefix} [K]::keybd_event(0x10,0,0,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x20,0,0,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x20,0,2,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x10,0,2,0)`;
  }
  return `${prefix} [K]::keybd_event(0x10,0,0,0); Start-Sleep -Milliseconds 10; [K]::keybd_event(0x10,0,2,0)`;
}

function sendConfiguredSameImeToggle(mode) {
  const shortcut = getSameImeToggleShortcut();
  const psScript = buildShortcutPowerShellScript(shortcut);
  markRecentSwitch(mode, `same-ime-shortcut:${shortcut}`);
  execFile("powershell.exe", ["-NoProfile", "-Command", psScript], { windowsHide: true }, (err) => {
    if (err) {
      logError("Failed to send same-IME toggle shortcut", { error: err.message, mode, shortcut });
      return;
    }
    logDebug("Sent same-IME toggle shortcut", { mode, shortcut });
  });
}

function runSwitchCommand(command, mode) {
  if (!command || !command.trim()) {
    return;
  }
  const cfg = getConfig();
  const exePath = resolveExePath(command);

  if (!fs.existsSync(exePath)) {
    logWarn(`Binary not found: ${exePath}`);
    if (!hasWarnedMissingBinary && cfg.get("warnOnMissingBinary", true)) {
      hasWarnedMissingBinary = true;
      vscode.window.showWarningMessage(
        `SmartCursor: cannot find ${exePath}. Place im-select.exe there or set imeContextSwitcher.imSelectPath.`
      );
    }
    return;
  }

  const englishCode = detectedEnglishCode || String(cfg.get("englishCode", "1033"));
  const chineseCode = String(cfg.get("chineseCode", "2052"));
  const useShiftWithinChineseIme = cfg.get("useShiftWithinChineseIme", false);
  const useShiftFallback = useShiftWithinChineseIme && englishCode === chineseCode;

  if (useShiftFallback) {
    if (mode === currentMode) {
      return;
    }
    sendConfiguredSameImeToggle(mode);
    return;
  }

  const code = mode === "chinese" ? chineseCode : englishCode;
  markRecentSwitch(mode, `ime-code:${code}`);
  execFile(exePath, [code], { windowsHide: true }, (err) => {
    if (err) {
      logError(`Failed to execute im-select`, { error: err.message, mode, code });
    }
  });
}

function queryCurrentImeCode(command) {
  return new Promise((resolve) => {
    if (!command || !command.trim()) {
      resolve(null);
      return;
    }
    const exePath = resolveExePath(command);
    if (!fs.existsSync(exePath)) {
      resolve(null);
      return;
    }
    execFile(exePath, [], { windowsHide: true }, (err, stdout) => {
      if (err) {
        logError(`Failed to query IME code`, { error: err.message });
        resolve(null);
        return;
      }
      const code = String(stdout || "").trim();
      resolve(code || null);
    });
  });
}

function updateImeForEditor(editor, force = false) {
  perfStart('updateImeForEditor');

  if (!editor) {
    perfEnd('updateImeForEditor');
    return;
  }
  const cfg = getConfig();
  if (!cfg.get("enabled", true)) {
    perfEnd('updateImeForEditor');
    return;
  }

  const shouldChinese = detectShouldUseChinese(editor);
  const nextMode = shouldChinese ? "chinese" : "english";
  if (nextMode === currentMode && !force) {
    perfEnd('updateImeForEditor');
    return;
  }

  const command = cfg.get("imSelectPath", "bin/im-select.exe");

  logInfo(`Switching IME mode`, {
    mode: nextMode,
    languageId: editor.document.languageId,
    line: editor.selection.active.line,
    character: editor.selection.active.character
  });
  runSwitchCommand(command, nextMode);
  currentMode = nextMode;
  updateStatusBar();

  perfEnd('updateImeForEditor');
}

function switchToMode(mode, force = false) {
  const cfg = getConfig();
  if (!cfg.get("enabled", true)) {
    return;
  }
  if (mode === currentMode && !force) {
    return;
  }
  const command = cfg.get("imSelectPath", "bin/im-select.exe");
  logInfo(`Manual mode switch`, { mode });
  runSwitchCommand(command, mode);
  currentMode = mode;
  updateStatusBar();
}

function switchToChineseOnBlur() {
  const cfg = getConfig();
  if (!cfg.get("switchToChineseOnEditorBlur", true)) {
    return;
  }
  switchToMode("chinese", true);
}

async function initializeEnglishCodeFromCurrentIme() {
  const cfg = getConfig();
  if (!cfg.get("captureInitialImeAsEnglish", true)) {
    detectedEnglishCode = null;
    return;
  }

  const command = cfg.get("imSelectPath", "bin/im-select.exe");
  const currentCode = await queryCurrentImeCode(command);
  const chineseCode = String(cfg.get("chineseCode", "2052"));

  if (currentCode && currentCode !== chineseCode) {
    detectedEnglishCode = currentCode;
    logInfo(`Detected English IME code`, { code: detectedEnglishCode });
    return;
  }

  detectedEnglishCode = null;
}

async function initializeSameImeInitialMode() {
  const cfg = getConfig();
  if (!cfg.get("useShiftWithinChineseIme", false)) {
    return;
  }

  const englishCode = detectedEnglishCode || String(cfg.get("englishCode", "1033"));
  const chineseCode = String(cfg.get("chineseCode", "2052"));
  if (englishCode !== chineseCode) {
    return;
  }

  const remembered = String(cfg.get("sameImeInitialMode", "unknown")).toLowerCase();
  if (remembered === "chinese" || remembered === "english") {
    currentMode = remembered;
    updateStatusBar();
    logInfo("Initialized same-IME mode from remembered preference", { mode: remembered });
    return;
  }

  if (!cfg.get("promptSameImeInitialModeOnStartup", true)) {
    return;
  }

  const action = await vscode.window.showInformationMessage(
    "SmartCursor: 当前处于同一输入法中英切换模式，请确认你现在的输入态。",
    { modal: true },
    "当前是中文",
    "当前是英文",
    "稍后再说"
  );

  if (action === "当前是中文") {
    currentMode = "chinese";
    await cfg.update("sameImeInitialMode", "chinese", vscode.ConfigurationTarget.Global);
    updateStatusBar();
    return;
  }

  if (action === "当前是英文") {
    currentMode = "english";
    await cfg.update("sameImeInitialMode", "english", vscode.ConfigurationTarget.Global);
    updateStatusBar();
  }
}

function startEditorFocusMonitor() {
  if (focusMonitorTimer) {
    clearInterval(focusMonitorTimer);
    focusMonitorTimer = null;
  }

  focusMonitorTimer = setInterval(async () => {
    if (focusCheckInFlight) {
      return;
    }
    focusCheckInFlight = true;
    try {
      const editorFocused = await vscode.commands.executeCommand("getContextKeyValue", "editorTextFocus");
      if (editorFocused === false) {
        switchToChineseOnBlur();
      }
      if (editorFocused === true && lastEditorTextFocus === false) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          scheduleUpdate(activeEditor, true);
        }
      }
      if (typeof editorFocused === "boolean") {
        lastEditorTextFocus = editorFocused;
      }
    } catch (err) {
      logError(`Focus monitor disabled`, { error: err.message });
      clearInterval(focusMonitorTimer);
      focusMonitorTimer = null;
    } finally {
      focusCheckInFlight = false;
    }
  }, 250);


}

// IME status monitor - polls current IME state and updates status bar
function startImeStatusMonitor() {
  if (imeStatusMonitorTimer) {
    clearInterval(imeStatusMonitorTimer);
    imeStatusMonitorTimer = null;
  }

  const cfg = getConfig();
  const command = cfg.get("imSelectPath", "bin/im-select.exe");

  imeStatusMonitorTimer = setInterval(async () => {
    if (imeStatusCheckInFlight) {
      return;
    }
    imeStatusCheckInFlight = true;
    try {
      const currentImeCode = await queryCurrentImeCode(command);
      if (!currentImeCode) {
        imeStatusCheckInFlight = false;
        return;
      }

      if (isWithinSwitchProtectionWindow()) {
        logDebug("Skip IME status sync within protection window", {
          strategy: lastSwitchStrategy,
          elapsedMs: Date.now() - lastSwitchTimestamp
        });
        return;
      }

      const chineseCode = String(cfg.get("chineseCode", "2052"));
      const englishCode = detectedEnglishCode || String(cfg.get("englishCode", "1033"));
      const useShiftWithinChineseIme = cfg.get("useShiftWithinChineseIme", false);
      const useShiftFallback = useShiftWithinChineseIme && englishCode === chineseCode;

      if (useShiftFallback && currentImeCode === chineseCode) {
        // Same-IME Shift mode cannot be inferred from IME code. Keep internal state.
        return;
      }

      // Determine mode based on current IME code
      let detectedMode = "unknown";
      if (currentImeCode === chineseCode) {
        detectedMode = "chinese";
      } else if (currentImeCode === englishCode) {
        detectedMode = "english";
      } else {
        // If it's neither, assume it's an English variant
        detectedMode = "english";
      }

      // Update currentMode and status bar if changed
      if (detectedMode !== currentMode && detectedMode !== "unknown") {
        logDebug(`IME status changed externally`, {
          from: currentMode,
          to: detectedMode,
          code: currentImeCode
        });
        currentMode = detectedMode;
        updateStatusBar();
      }
    } catch (err) {
      logError(`IME status monitor error`, { error: err.message });
    } finally {
      imeStatusCheckInFlight = false;
    }
  }, 1000); // Poll every 1 second

  logInfo(`IME status monitor started`);
}

function scheduleUpdate(editor, force = false) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => updateImeForEditor(editor, force), 50);
}

async function activate(context) {
  extensionPath = context.extensionPath;

  // 创建状态栏 (Phase 2.2: Add click command)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "imeContextSwitcher.toggleIme";
  context.subscriptions.push(statusBarItem);

  // Register commands (Phase 2.2)
  context.subscriptions.push(
    vscode.commands.registerCommand("imeContextSwitcher.toggleEnabled", commandToggleEnabled)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("imeContextSwitcher.switchToChinese", commandSwitchToChinese)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("imeContextSwitcher.switchToEnglish", commandSwitchToEnglish)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("imeContextSwitcher.toggleIme", commandToggleIme)
  );
  // Register IME detection command (Phase 2.3)
  context.subscriptions.push(
    vscode.commands.registerCommand("imeContextSwitcher.detectImeCodes", commandDetectImeCodes)
  );

  await initializeEnglishCodeFromCurrentIme();
  await initializeSameImeInitialMode();
  startEditorFocusMonitor();
  startImeStatusMonitor();

  context.subscriptions.push({
    dispose: () => {
      if (focusMonitorTimer) {
        clearInterval(focusMonitorTimer);
        focusMonitorTimer = null;
      }
      if (imeStatusMonitorTimer) {
        clearInterval(imeStatusMonitorTimer);
        imeStatusMonitorTimer = null;
      }
    },
  });
  const active = vscode.window.activeTextEditor;
  if (active) {
    scheduleUpdate(active);
  } else {
    switchToChineseOnBlur();
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        scheduleUpdate(editor, true);
      } else {
        switchToChineseOnBlur();
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((event) => {
      scheduleUpdate(event.textEditor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      // Phase 3.2: Clear cache when document changes
      if (isFeatureEnabled("performanceCache")) {
        clearCacheForDocument(event.document.uri);
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      if (event.document === editor.document) {
        scheduleUpdate(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      switchToChineseOnBlur();
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((state) => {
      if (!state.focused) {
        switchToChineseOnBlur();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("imeContextSwitcher")) {
        initializeEnglishCodeFromCurrentIme().then(() => initializeSameImeInitialMode());
        startEditorFocusMonitor();
        startImeStatusMonitor();
        scheduleUpdate(vscode.window.activeTextEditor, true);
      }
    })
  );
}

function deactivate() {
  // 退出时切换到中文输入法
  const cfg = getConfig();
  if (!cfg.get("enabled", true)) {
    return;
  }

  const command = cfg.get("imSelectPath", "bin/im-select.exe");
  const exePath = resolveExePath(command);

  if (fs.existsSync(exePath)) {
    const chineseCode = String(cfg.get("chineseCode", "2052"));
    logInfo(`Deactivating extension, switching to Chinese`, { code: chineseCode });
    execFile(exePath, [chineseCode], { windowsHide: true }, (err) => {
      if (err) {
        logError(`Failed to switch IME on deactivate`, { error: err.message });
      }
    });
  }
}

module.exports = {
  activate,
  deactivate,
};

