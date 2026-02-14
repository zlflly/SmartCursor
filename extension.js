const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

let currentMode = "unknown";
let timer = null;
let output = null;
let extensionPath = "";
let hasWarnedMissingBinary = false;

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

  if (cfg.get("enableInLineComment", true)) {
    const commentStart = findLineCommentStart(beforeCursor);
    if (commentStart >= 0 && position.character > commentStart + 1) {
      return true;
    }
  }

  if (cfg.get("enableInDoubleQuotedString", true)) {
    if (isInsideDoubleQuotedString(beforeCursor)) {
      return true;
    }
  }

  return false;
}

function runSwitchCommand(command) {
  if (!command || !command.trim()) {
    return;
  }
  const cfg = getConfig();
  const exePath = path.isAbsolute(command)
    ? command
    : path.join(extensionPath, command);

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

  const code = currentMode === "chinese"
    ? String(cfg.get("chineseCode", "2052"))
    : String(cfg.get("englishCode", "1033"));

  execFile(exePath, [code], { windowsHide: true }, (err) => {
    if (err) {
      log(`[exec error] ${err.message}`);
    }
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
  runSwitchCommand(command);
}

function scheduleUpdate(editor) {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => updateImeForEditor(editor), 50);
}

function activate(context) {
  extensionPath = context.extensionPath;
  const active = vscode.window.activeTextEditor;
  if (active) {
    scheduleUpdate(active);
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      scheduleUpdate(editor);
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
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("imeContextSwitcher")) {
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
