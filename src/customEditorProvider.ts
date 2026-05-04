import * as vscode from 'vscode';
import { parseEnvContent, isSecretKey, findDuplicates, EnvEntry } from './envParser';
import { formatEnvContent, sortEnvContent } from './envFormatter';
import { Config } from './config';
import { Logger } from './logger';

const logger = Logger.getInstance();

/**
 * Custom editor provider that renders .env files as a rich management UI.
 * Files matching .env, .env.*, or *.env can be opened with this editor.
 */
export class DotenvCustomEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'dotenvManager.envEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when a custom editor is opened.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: []
    };

    // Initial render
    this.updateWebview(webviewPanel.webview, document);

    // Listen for document changes
    const changeDocSub = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        this.updateWebview(webviewPanel.webview, document);
      }
    });

    // Listen for config changes
    const changeConfigSub = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('dotenvManager')) {
        this.updateWebview(webviewPanel.webview, document);
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocSub.dispose();
      changeConfigSub.dispose();
    });

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (msg) => {
      try {
        switch (msg.type) {
          case 'edit':
            await this.handleEdit(document, msg.lineNumber, msg.key, msg.value);
            break;
          case 'delete':
            await this.handleDelete(document, msg.lineNumber);
            break;
          case 'add':
            await this.handleAdd(document, msg.key, msg.value);
            break;
          case 'sort':
            await this.handleSort(document);
            break;
          case 'format':
            await this.handleFormat(document);
            break;
          case 'openAsText':
            await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
            break;
          case 'toggleMask':
            await vscode.commands.executeCommand('dotenvManager.toggleSecretMask');
            break;
          case 'copyValue':
            if (msg.value !== undefined) {
              await vscode.env.clipboard.writeText(msg.value);
              vscode.window.showInformationMessage(`Copied value of "${msg.key}" to clipboard.`);
            }
            break;
          case 'generateExample':
            await this.handleGenerateExample(document);
            break;
          default:
            logger.warn(`Unknown message type from webview: ${msg.type}`);
        }
      } catch (err) {
        logger.error('Error handling webview message', err);
        vscode.window.showErrorMessage('DotEnv Manager: An error occurred processing your action.');
      }
    });
  }

  /**
   * Update the webview HTML with current document state.
   */
  private updateWebview(webview: vscode.Webview, document: vscode.TextDocument): void {
    const text = document.getText();
    const entries = parseEnvContent(text);
    const duplicates = findDuplicates(entries);
    const maskSecrets = Config.maskSecrets;
    const secretPatterns = Config.secretPatterns;
    const groupByPrefix = Config.groupByPrefix;
    const fileName = document.uri.path.split('/').pop() ?? '.env';

    const variableEntries = entries.filter(e => e.key);
    const commentCount = entries.filter(e => e.isComment).length;
    const dupeCount = duplicates.size;

    webview.html = this.getHtml(
      webview, fileName, variableEntries, commentCount, dupeCount,
      duplicates, maskSecrets, secretPatterns, groupByPrefix
    );
  }

  /**
   * Build the full HTML for the custom editor webview.
   */
  private getHtml(
    _webview: vscode.Webview,
    fileName: string,
    entries: EnvEntry[],
    commentCount: number,
    dupeCount: number,
    duplicates: Map<string, number[]>,
    maskSecrets: boolean,
    secretPatterns: string[],
    groupByPrefix: boolean
  ): string {
    // Group entries by prefix if enabled
    let groupedHtml: string;
    if (groupByPrefix) {
      groupedHtml = this.buildGroupedTable(entries, duplicates, maskSecrets, secretPatterns);
    } else {
      groupedHtml = this.buildFlatTable(entries, duplicates, maskSecrets, secretPatterns);
    }

    const dupeWarning = dupeCount > 0
      ? `<div class="banner warning"><span class="icon">&#9888;</span> ${dupeCount} duplicate key${dupeCount > 1 ? 's' : ''} detected</div>`
      : '';

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(fileName)}</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --border: var(--vscode-panel-border, #444);
      --input-bg: var(--vscode-input-background);
      --input-fg: var(--vscode-input-foreground);
      --input-border: var(--vscode-input-border, #555);
      --btn-bg: var(--vscode-button-background);
      --btn-fg: var(--vscode-button-foreground);
      --btn-hover: var(--vscode-button-hoverBackground);
      --btn-sec-bg: var(--vscode-button-secondaryBackground);
      --btn-sec-fg: var(--vscode-button-secondaryForeground);
      --badge-bg: var(--vscode-badge-background);
      --badge-fg: var(--vscode-badge-foreground);
      --warning-bg: #6b5e0033;
      --warning-border: #c9a825;
      --danger-bg: #6b1a1a33;
      --danger-border: #d14;
      --secret-color: #e06c75;
      --key-color: var(--vscode-symbolIcon-variableForeground, #9cdcfe);
      --group-bg: var(--vscode-sideBar-background, #252526);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background: var(--bg);
      padding: 0;
    }
    .header {
      position: sticky; top: 0; z-index: 10;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      padding: 12px 20px;
    }
    .header-top {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 8px;
    }
    .header h1 {
      font-size: 16px; font-weight: 600;
      display: flex; align-items: center; gap: 8px;
    }
    .header h1 .file-icon { opacity: 0.7; }
    .stats {
      display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap;
    }
    .stat {
      font-size: 11px; opacity: 0.8;
      display: flex; align-items: center; gap: 4px;
    }
    .toolbar {
      display: flex; gap: 6px; flex-wrap: wrap;
    }
    .btn {
      padding: 4px 10px;
      border: none; border-radius: 3px; cursor: pointer;
      font-size: 12px; font-family: inherit;
      background: var(--btn-bg); color: var(--btn-fg);
      display: inline-flex; align-items: center; gap: 4px;
      transition: background 0.15s;
    }
    .btn:hover { background: var(--btn-hover); }
    .btn-secondary {
      background: var(--btn-sec-bg); color: var(--btn-sec-fg);
    }
    .btn-danger {
      background: #a03030; color: #fff;
    }
    .btn-danger:hover { background: #c04040; }
    .btn-small {
      padding: 2px 6px; font-size: 11px;
    }
    .banner {
      padding: 8px 20px; font-size: 12px;
      display: flex; align-items: center; gap: 8px;
    }
    .banner.warning {
      background: var(--warning-bg);
      border-bottom: 1px solid var(--warning-border);
      color: #e0c050;
    }
    .content { padding: 12px 20px 80px; }
    .group {
      margin-bottom: 16px;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    .group-header {
      background: var(--group-bg);
      padding: 8px 14px;
      font-weight: 600; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.5px;
      display: flex; align-items: center; gap: 8px;
      cursor: pointer; user-select: none;
    }
    .group-header .badge {
      background: var(--badge-bg); color: var(--badge-fg);
      padding: 1px 7px; border-radius: 10px;
      font-size: 10px; font-weight: normal;
    }
    table {
      width: 100%; border-collapse: collapse;
    }
    th {
      text-align: left; padding: 6px 14px;
      font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.5px; opacity: 0.6;
      border-bottom: 1px solid var(--border);
      background: var(--group-bg);
    }
    td {
      padding: 5px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.03); }
    tr.duplicate td { background: var(--warning-bg); }
    .key-cell {
      font-family: var(--vscode-editor-font-family, monospace);
      font-weight: 600; color: var(--key-color);
      white-space: nowrap;
    }
    .value-cell {
      font-family: var(--vscode-editor-font-family, monospace);
      word-break: break-all; max-width: 500px;
    }
    .masked {
      color: var(--secret-color); font-style: italic;
      cursor: pointer;
    }
    .masked:hover::after {
      content: ' (click to reveal)';
      font-size: 10px; opacity: 0.6;
    }
    .line-num {
      opacity: 0.4; font-size: 11px; font-family: monospace;
      min-width: 30px; text-align: right;
    }
    .actions-cell {
      white-space: nowrap; text-align: right; min-width: 100px;
    }
    .add-form {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: var(--group-bg);
      border-top: 1px solid var(--border);
      padding: 10px 20px;
      display: flex; gap: 8px; align-items: center;
      z-index: 10;
    }
    .add-form input {
      padding: 5px 10px; border: 1px solid var(--input-border);
      background: var(--input-bg); color: var(--input-fg);
      border-radius: 3px; font-family: monospace;
      font-size: 13px;
    }
    .add-form input:focus {
      outline: 1px solid var(--btn-bg);
    }
    .add-form .key-input { width: 200px; }
    .add-form .value-input { flex: 1; }
    .search-bar {
      margin: 10px 0;
    }
    .search-bar input {
      width: 100%; padding: 6px 12px;
      border: 1px solid var(--input-border);
      background: var(--input-bg); color: var(--input-fg);
      border-radius: 4px; font-size: 13px;
    }
    .search-bar input:focus { outline: 1px solid var(--btn-bg); }
    .empty-state {
      text-align: center; padding: 60px 20px;
      opacity: 0.5;
    }
    .empty-state h2 { font-size: 18px; margin-bottom: 8px; }

    /* Edit modal overlay */
    .modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 100;
      align-items: center; justify-content: center;
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 20px; width: 500px; max-width: 90vw;
    }
    .modal h2 { font-size: 14px; margin-bottom: 12px; }
    .modal label { display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.7; }
    .modal input, .modal textarea {
      width: 100%; padding: 6px 10px; margin-bottom: 12px;
      border: 1px solid var(--input-border);
      background: var(--input-bg); color: var(--input-fg);
      border-radius: 3px; font-family: monospace; font-size: 13px;
    }
    .modal textarea { min-height: 60px; resize: vertical; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <h1><span class="file-icon">&#128273;</span> ${this.escapeHtml(fileName)}</h1>
      <div class="toolbar">
        <button class="btn" onclick="doSort()" title="Sort alphabetically">&#8645; Sort</button>
        <button class="btn" onclick="doFormat()" title="Format file">&#10024; Format</button>
        <button class="btn btn-secondary" onclick="doToggleMask()" title="Toggle secret masking">&#128065; Mask</button>
        <button class="btn btn-secondary" onclick="doGenerateExample()" title="Generate .env.example">&#128196; Example</button>
        <button class="btn btn-secondary" onclick="doOpenAsText()" title="Open as plain text">&#128196; Text</button>
      </div>
    </div>
    <div class="stats">
      <span class="stat">&#128204; ${entries.length} variable${entries.length !== 1 ? 's' : ''}</span>
      <span class="stat">&#128172; ${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>
      ${dupeCount > 0 ? `<span class="stat" style="color:#e0c050">&#9888; ${dupeCount} duplicate${dupeCount !== 1 ? 's' : ''}</span>` : ''}
    </div>
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Search variables..." oninput="filterRows()" />
    </div>
  </div>

  ${dupeWarning}

  <div class="content">
    ${entries.length === 0 ? `
      <div class="empty-state">
        <h2>No variables defined</h2>
        <p>Add your first environment variable using the form below.</p>
      </div>
    ` : groupedHtml}
  </div>

  <div class="add-form">
    <span style="opacity:0.6;font-size:12px;">&#10010;</span>
    <input class="key-input" type="text" id="newKey" placeholder="VARIABLE_NAME" />
    <input class="value-input" type="text" id="newValue" placeholder="value" />
    <button class="btn" onclick="doAdd()">Add Variable</button>
  </div>

  <!-- Edit Modal -->
  <div class="modal-overlay" id="editModal">
    <div class="modal">
      <h2>Edit Variable</h2>
      <input type="hidden" id="editLine" />
      <label>Key</label>
      <input type="text" id="editKey" />
      <label>Value</label>
      <textarea id="editValue"></textarea>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
        <button class="btn" onclick="saveEdit()">Save</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function filterRows() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      document.querySelectorAll('tr[data-key]').forEach(row => {
        const key = row.getAttribute('data-key').toLowerCase();
        const val = row.getAttribute('data-value') || '';
        row.style.display = (key.includes(q) || val.toLowerCase().includes(q)) ? '' : 'none';
      });
    }

    function doSort() { vscode.postMessage({ type: 'sort' }); }
    function doFormat() { vscode.postMessage({ type: 'format' }); }
    function doToggleMask() { vscode.postMessage({ type: 'toggleMask' }); }
    function doOpenAsText() { vscode.postMessage({ type: 'openAsText' }); }
    function doGenerateExample() { vscode.postMessage({ type: 'generateExample' }); }

    function doAdd() {
      const key = document.getElementById('newKey').value.trim();
      const value = document.getElementById('newValue').value;
      if (!key) { return; }
      vscode.postMessage({ type: 'add', key, value });
      document.getElementById('newKey').value = '';
      document.getElementById('newValue').value = '';
    }

    function doDelete(lineNumber) {
      vscode.postMessage({ type: 'delete', lineNumber });
    }

    function doCopy(key, value) {
      vscode.postMessage({ type: 'copyValue', key, value });
    }

    function openEditModal(lineNumber, key, value) {
      document.getElementById('editLine').value = lineNumber;
      document.getElementById('editKey').value = key;
      document.getElementById('editValue').value = value;
      document.getElementById('editModal').classList.add('active');
      document.getElementById('editKey').focus();
    }

    function closeEditModal() {
      document.getElementById('editModal').classList.remove('active');
    }

    function saveEdit() {
      const lineNumber = parseInt(document.getElementById('editLine').value, 10);
      const key = document.getElementById('editKey').value.trim();
      const value = document.getElementById('editValue').value;
      if (!key) { return; }
      vscode.postMessage({ type: 'edit', lineNumber, key, value });
      closeEditModal();
    }

    function revealValue(el) {
      const actual = el.getAttribute('data-actual');
      if (el.textContent === actual) {
        el.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
        el.classList.add('masked');
      } else {
        el.textContent = actual;
        el.classList.remove('masked');
      }
    }

    // Handle Enter key in add form
    document.getElementById('newValue').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { doAdd(); }
    });
    document.getElementById('newKey').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { document.getElementById('newValue').focus(); }
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeEditModal(); }
    });

    // Close modal on overlay click
    document.getElementById('editModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('editModal')) { closeEditModal(); }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Build a flat (ungrouped) table of all entries.
   */
  private buildFlatTable(
    entries: EnvEntry[],
    duplicates: Map<string, number[]>,
    maskSecrets: boolean,
    secretPatterns: string[]
  ): string {
    if (entries.length === 0) { return ''; }

    let html = `<table>
      <thead><tr>
        <th style="width:40px">#</th>
        <th>Key</th>
        <th>Value</th>
        <th style="width:120px">Actions</th>
      </tr></thead><tbody>`;

    for (const entry of entries) {
      if (!entry.key) { continue; }
      html += this.buildRow(entry, duplicates, maskSecrets, secretPatterns);
    }

    html += '</tbody></table>';
    return html;
  }

  /**
   * Build a grouped table where entries are grouped by prefix.
   */
  private buildGroupedTable(
    entries: EnvEntry[],
    duplicates: Map<string, number[]>,
    maskSecrets: boolean,
    secretPatterns: string[]
  ): string {
    if (entries.length === 0) { return ''; }

    // Group by prefix (text before first underscore)
    const groups = new Map<string, EnvEntry[]>();
    for (const entry of entries) {
      if (!entry.key) { continue; }
      const underscoreIdx = entry.key.indexOf('_');
      const prefix = underscoreIdx > 0 ? entry.key.substring(0, underscoreIdx) : 'GENERAL';
      const group = groups.get(prefix) ?? [];
      group.push(entry);
      groups.set(prefix, group);
    }

    // Sort group names
    const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    let html = '';
    for (const [prefix, groupEntries] of sortedGroups) {
      html += `<div class="group">
        <div class="group-header">
          <span>${this.escapeHtml(prefix)}</span>
          <span class="badge">${groupEntries.length}</span>
        </div>
        <table>
          <thead><tr>
            <th style="width:40px">#</th>
            <th>Key</th>
            <th>Value</th>
            <th style="width:120px">Actions</th>
          </tr></thead><tbody>`;

      for (const entry of groupEntries) {
        html += this.buildRow(entry, duplicates, maskSecrets, secretPatterns);
      }

      html += '</tbody></table></div>';
    }

    return html;
  }

  /**
   * Build a single table row for an entry.
   */
  private buildRow(
    entry: EnvEntry,
    duplicates: Map<string, number[]>,
    maskSecrets: boolean,
    secretPatterns: string[]
  ): string {
    const key = entry.key ?? '';
    const value = entry.value ?? '';
    const isDupe = duplicates.has(key);
    const isSecret = maskSecrets && isSecretKey(key, secretPatterns);
    const escapedKey = this.escapeHtml(key);
    const escapedValue = this.escapeHtml(value);
    const rowClass = isDupe ? ' class="duplicate"' : '';

    const valueHtml = isSecret
      ? `<span class="masked" data-actual="${this.escapeAttr(value)}" onclick="revealValue(this)">\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</span>`
      : `<span>${escapedValue || '<em style="opacity:0.4">empty</em>'}</span>`;

    return `<tr${rowClass} data-key="${this.escapeAttr(key)}" data-value="${this.escapeAttr(value)}">
      <td class="line-num">${entry.lineNumber + 1}</td>
      <td class="key-cell">${escapedKey}${isDupe ? ' <span style="color:#e0c050" title="Duplicate key">&#9888;</span>' : ''}${isSecret ? ' <span style="color:var(--secret-color)" title="Secret">&#128274;</span>' : ''}</td>
      <td class="value-cell">${valueHtml}</td>
      <td class="actions-cell">
        <button class="btn btn-small btn-secondary" onclick="openEditModal(${entry.lineNumber},'${this.escapeAttr(key)}','${this.escapeAttr(value)}')" title="Edit">&#9998;</button>
        <button class="btn btn-small btn-secondary" onclick="doCopy('${this.escapeAttr(key)}','${this.escapeAttr(value)}')" title="Copy value">&#128203;</button>
        <button class="btn btn-small btn-danger" onclick="doDelete(${entry.lineNumber})" title="Delete">&#128465;</button>
      </td>
    </tr>`;
  }

  // --- Document edit handlers ---

  private async handleEdit(document: vscode.TextDocument, lineNumber: number, key: string, value: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineNumber);
    const needsQuotes = value.includes(' ') || value.includes('#');
    const formattedValue = needsQuotes ? `"${value}"` : value;
    edit.replace(document.uri, line.range, `${key}=${formattedValue}`);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  private async handleDelete(document: vscode.TextDocument, lineNumber: number): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineNumber);
    // Delete the line including the newline character
    const range = lineNumber < document.lineCount - 1
      ? new vscode.Range(lineNumber, 0, lineNumber + 1, 0)
      : new vscode.Range(
          lineNumber > 0 ? lineNumber - 1 : 0,
          lineNumber > 0 ? document.lineAt(lineNumber - 1).text.length : 0,
          lineNumber,
          line.text.length
        );
    edit.delete(document.uri, range);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  private async handleAdd(document: vscode.TextDocument, key: string, value: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const needsQuotes = value.includes(' ') || value.includes('#');
    const formattedValue = needsQuotes ? `"${value}"` : value;
    const newLine = `${key}=${formattedValue}`;
    const lastLine = document.lineCount - 1;
    const lastLineText = document.lineAt(lastLine).text;
    const insertText = lastLineText.trim() === '' ? `${newLine}\n` : `\n${newLine}`;
    const pos = new vscode.Position(lastLine, lastLineText.length);
    edit.insert(document.uri, pos, insertText);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  private async handleSort(document: vscode.TextDocument): Promise<void> {
    const sorted = sortEnvContent(document.getText());
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    edit.replace(document.uri, fullRange, sorted);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  private async handleFormat(document: vscode.TextDocument): Promise<void> {
    const formatted = formatEnvContent(document.getText());
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    edit.replace(document.uri, fullRange, formatted);
    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  private async handleGenerateExample(document: vscode.TextDocument): Promise<void> {
    const entries = parseEnvContent(document.getText());
    const lines: string[] = [
      '# Generated by DotEnv Manager',
      `# Source: ${document.uri.path.split('/').pop()}`,
      `# Date: ${new Date().toISOString()}`,
      ''
    ];

    for (const entry of entries) {
      if (entry.isComment) {
        lines.push(entry.raw);
      } else if (entry.isBlank) {
        lines.push('');
      } else if (entry.key) {
        lines.push(`${entry.key}=`);
      }
    }

    const exampleUri = vscode.Uri.joinPath(
      vscode.Uri.file(document.uri.fsPath.replace(/[^\/\\]+$/, '')),
      '.env.example'
    );

    await vscode.workspace.fs.writeFile(
      exampleUri,
      Buffer.from(lines.join('\n') + '\n', 'utf-8')
    );

    const doc = await vscode.workspace.openTextDocument(exampleUri);
    await vscode.window.showTextDocument(doc);
    vscode.window.showInformationMessage('Generated .env.example file.');
  }

  // --- HTML helpers ---

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeAttr(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\\/g, '\\\\');
  }
}
