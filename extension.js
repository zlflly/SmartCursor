const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

let currentMode = "unknown";
let timer = null;
let focusMonitorTimer = null;
let focusCheckInFlight = false;
let output = null;
let extensionPath = "";
let hasWarnedMissingBinary = false;
let detectedEnglishCode = null;

function getConfig() {
  return vscode.workspace.getConfiguration("imeContextSwitcher");
}

function log(message) {
  const cfg = getConfig();
  if (!cfg.get("debug", false)) {
    return;
  }
  if (!output) {
    output = vscode.window.createOutputChannel("SmartCursor");
  }
  output.appendLine(message);
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
  for (let i = 0; i < beforeCursor.length - 1; i++) {
    const ch = beforeCursor[i];
    if (ch === '"' && !isEscaped(beforeCursor, i)) {
      inDouble = !inDouble;
      continue;
    }
    if (!inDouble && ch === "/" && beforeCursor[i + 1] === "/") {
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

function analyzeContextUntilPosition(document, position) {
  const text = document.getText(new vscode.Range(new vscode.Position(0, 0), position));

  let inDouble = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

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
      inDouble = true;
      continue;
    }

    if (ch === "'" && !isEscaped(text, i)) {
      inSingle = true;
    }
  }

  return {
    inBlockComment,
    inDoubleString: inDouble,
  };
}

function detectShouldUseChinese(editor) {
  const cfg = getConfig();
  const enabledLangs = cfg.get("enabledLanguageIds", ["c", "cpp"]);
  const languageId = editor.document.languageId;
  if (!enabledLangs.includes(languageId)) {
    return false;
  }

  const position = editor.selection.active;
  const lineText = editor.document.lineAt(position.line).text;
  const beforeCursor = lineText.slice(0, position.character);
  const context = analyzeContextUntilPosition(editor.document, position);

  if (cfg.get("enableInLineComment", true)) {
    const commentStart = findLineCommentStart(beforeCursor);
    if (commentStart >= 0 && position.character > commentStart + 1) {
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

  return false;
}

function runSwitchCommand(command, mode) {
  if (!command || !command.trim()) {
    return;
  }
  const cfg = getConfig();
  const exePath = resolveExePath(command);

  if (!fs.existsSync(exePath)) {
    log(`[missing] ${exePath}`);
    if (!hasWarnedMissingBinary && cfg.get("warnOnMissingBinary", true)) {
      hasWarnedMissingBinary = true;
      vscode.window.showWarningMessage(
        `SmartCursor: cannot find ${exePath}. Place im-select.exe there or set imeContextSwitcher.imSelectPath.`
      );
    }
    return;
  }

  const englishCode = detectedEnglishCode || String(cfg.get("englishCode", "1033"));
  const code = mode === "chinese"
    ? String(cfg.get("chineseCode", "2052"))
    : englishCode;

  execFile(exePath, [code], { windowsHide: true }, (err) => {
    if (err) {
      log(`[exec error] ${err.message}`);
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
        log(`[query error] ${err.message}`);
        resolve(null);
        return;
      }
      const code = String(stdout || "").trim();
      resolve(code || null);
    });
  });
}

function updateImeForEditor(editor) {
  if (!editor) {
    return;
  }
  const cfg = getConfig();
  if (!cfg.get("enabled", true)) {
    return;
  }

  const shouldChinese = detectShouldUseChinese(editor);
  const nextMode = shouldChinese ? "chinese" : "english";
  if (nextMode === currentMode) {
    return;
  }

  currentMode = nextMode;
  const command = cfg.get("imSelectPath", "bin/im-select.exe");

  log(`[switch] ${nextMode} -> ${command}`);
  runSwitchCommand(command, nextMode);
}

function switchToMode(mode) {
  const cfg = getConfig();
  if (!cfg.get("enabled", true)) {
    return;
  }
  if (mode === currentMode) {
    return;
  }
  currentMode = mode;
  const command = cfg.get("imSelectPath", "bin/im-select.exe");
  log(`[switch] ${mode} -> ${command}`);
  runSwitchCommand(command, mode);
}

function switchToChineseOnBlur() {
  const cfg = getConfig();
  if (!cfg.get("switchToChineseOnEditorBlur", true)) {
    return;
  }
  switchToMode("chinese");
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
    log(`[init] detected englishCode=${detectedEnglishCode}`);
    return;
  }

  detectedEnglishCode = null;
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
    } catch (err) {
      log(`[focus monitor disabled] ${err.message}`);
      clearInterval(focusMonitorTimer);
      focusMonitorTimer = null;
    } finally {
      focusCheckInFlight = false;
    }
  }, 250);


}

function scheduleUpdate(editor) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => updateImeForEditor(editor), 50);
}

async function activate(context) {
  extensionPath = context.extensionPath;

  await initializeEnglishCodeFromCurrentIme();
  startEditorFocusMonitor();

  context.subscriptions.push({
    dispose: () => {
      if (focusMonitorTimer) {
        clearInterval(focusMonitorTimer);
        focusMonitorTimer = null;
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
        scheduleUpdate(editor);
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
        initializeEnglishCodeFromCurrentIme();
        startEditorFocusMonitor();
        scheduleUpdate(vscode.window.activeTextEditor);
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
