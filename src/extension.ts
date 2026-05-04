import * as vscode from 'vscode';
import { Logger } from './logger';
import { Config } from './config';
import { StatusBarManager } from './statusBar';
import { openEnvTerminal } from './terminal';
import { DiagnosticsProvider } from './diagnosticsProvider';
import { EnvCompletionProvider } from './completionProvider';
import { DotenvCustomEditorProvider } from './customEditorProvider';
import { parseEnvContent, findDuplicates } from './envParser';
import { formatEnvContent, sortEnvContent } from './envFormatter';

const logger = Logger.getInstance();

export function activate(context: vscode.ExtensionContext): void {
  logger.info('DotEnv Manager activating...');

  const statusBar = new StatusBarManager();
  const diagnostics = new DiagnosticsProvider();

  // --- Custom Editor Provider (the main manager view) ---
  const customEditorProvider = new DotenvCustomEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      DotenvCustomEditorProvider.viewType,
      customEditorProvider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    )
  );

  // --- Completion Provider ---
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'dotenv' },
      new EnvCompletionProvider(),
      ''
    )
  );

  // --- Diagnostics on open/change/save ---
  if (Config.validateOnType) {
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(doc => diagnostics.update(doc)),
      vscode.workspace.onDidChangeTextDocument(e => diagnostics.update(e.document)),
      vscode.workspace.onDidSaveTextDocument(doc => diagnostics.update(doc))
    );
  }

  // --- Status bar updates ---
  const updateStatusBar = (editor?: vscode.TextEditor) => {
    if (editor && editor.document.languageId === 'dotenv') {
      const entries = parseEnvContent(editor.document.getText());
      const varCount = entries.filter(e => e.key).length;
      statusBar.update(varCount);
    } else {
      statusBar.hide();
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        updateStatusBar(vscode.window.activeTextEditor);
      }
    })
  );
  updateStatusBar(vscode.window.activeTextEditor);

  // --- Format on save ---
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (doc.languageId !== 'dotenv') { return; }
      try {
        let newText = doc.getText();
        let changed = false;

        if (Config.sortOnSave) {
          newText = sortEnvContent(newText);
          changed = true;
        }
        if (Config.formatOnSave) {
          newText = formatEnvContent(newText);
          changed = true;
        }

        if (changed && newText !== doc.getText()) {
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(doc.getText().length)
          );
          edit.replace(doc.uri, fullRange, newText);
          await vscode.workspace.applyEdit(edit);
          await doc.save();
        }
      } catch (err) {
        logger.error('Format/sort on save failed', err);
      }
    })
  );

  // --- Secret mask state ---
  let secretMaskEnabled = Config.maskSecrets;

  // --- Command registrations ---
  const registrations = [
    vscode.commands.registerCommand('dotenvManager.showInfo', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'dotenv') {
        vscode.window.showInformationMessage('DotEnv Manager v4.2.0 — Open a .env file to get started.');
        return;
      }
      const entries = parseEnvContent(editor.document.getText());
      const vars = entries.filter(e => e.key).length;
      const comments = entries.filter(e => e.isComment).length;
      const dupes = findDuplicates(entries).size;
      vscode.window.showInformationMessage(
        `DotEnv Manager: ${vars} variables, ${comments} comments, ${dupes} duplicates`
      );
    }),

    vscode.commands.registerCommand('dotenvManager.openTerminal', () => {
      openEnvTerminal();
    }),

    vscode.commands.registerCommand('dotenvManager.sortVariables', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'dotenv') {
        vscode.window.showWarningMessage('Open a .env file first.');
        return;
      }
      const sorted = sortEnvContent(editor.document.getText());
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );
      edit.replace(editor.document.uri, fullRange, sorted);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage('Variables sorted alphabetically.');
    }),

    vscode.commands.registerCommand('dotenvManager.formatFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'dotenv') {
        vscode.window.showWarningMessage('Open a .env file first.');
        return;
      }
      const formatted = formatEnvContent(editor.document.getText());
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
      );
      edit.replace(editor.document.uri, fullRange, formatted);
      await vscode.workspace.applyEdit(edit);
      vscode.window.showInformationMessage('.env file formatted.');
    }),

    vscode.commands.registerCommand('dotenvManager.detectDuplicates', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'dotenv') {
        vscode.window.showWarningMessage('Open a .env file first.');
        return;
      }
      const entries = parseEnvContent(editor.document.getText());
      const dupes = findDuplicates(entries);
      if (dupes.size === 0) {
        vscode.window.showInformationMessage('No duplicate keys found.');
      } else {
        const msgs: string[] = [];
        for (const [key, lines] of dupes) {
          msgs.push(`"${key}" on lines ${lines.map(l => l + 1).join(', ')}`);
        }
        vscode.window.showWarningMessage(`Duplicates: ${msgs.join('; ')}`);
      }
    }),

    vscode.commands.registerCommand('dotenvManager.toggleSecretMask', async () => {
      secretMaskEnabled = !secretMaskEnabled;
      const config = vscode.workspace.getConfiguration('dotenvManager');
      await config.update('maskSecrets', secretMaskEnabled, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `Secret masking ${secretMaskEnabled ? 'enabled' : 'disabled'}.`
      );
    }),

    vscode.commands.registerCommand('dotenvManager.generateExample', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'dotenv') {
        vscode.window.showWarningMessage('Open a .env file first.');
        return;
      }
      const entries = parseEnvContent(editor.document.getText());
      const lines: string[] = [
        '# Generated by DotEnv Manager',
        `# Source: ${editor.document.uri.path.split('/').pop()}`,
        `# Date: ${new Date().toISOString()}`,
        ''
      ];
      for (const entry of entries) {
        if (entry.isComment) { lines.push(entry.raw); }
        else if (entry.isBlank) { lines.push(''); }
        else if (entry.key) { lines.push(`${entry.key}=`); }
      }

      const dir = editor.document.uri.fsPath.replace(/[^\/\\]+$/, '');
      const exampleUri = vscode.Uri.file(dir + '.env.example');
      await vscode.workspace.fs.writeFile(
        exampleUri,
        Buffer.from(lines.join('\n') + '\n', 'utf-8')
      );
      const doc = await vscode.workspace.openTextDocument(exampleUri);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage('Generated .env.example file.');
    }),

    vscode.commands.registerCommand('dotenvManager.compareEnvFiles', async () => {
      const files = await vscode.workspace.findFiles('**/.env*', '**/node_modules/**', 20);
      if (files.length < 2) {
        vscode.window.showWarningMessage('Need at least 2 .env files to compare.');
        return;
      }
      const items = files.map(f => ({
        label: vscode.workspace.asRelativePath(f),
        uri: f
      }));
      const first = await vscode.window.showQuickPick(items, { placeHolder: 'Select first file' });
      if (!first) { return; }
      const remaining = items.filter(i => i.uri.toString() !== first.uri.toString());
      const second = await vscode.window.showQuickPick(remaining, { placeHolder: 'Select second file' });
      if (!second) { return; }
      await vscode.commands.executeCommand('vscode.diff', first.uri, second.uri,
        `${first.label} \u2194 ${second.label}`);
    }),

    vscode.commands.registerCommand('dotenvManager.clearDiagnostics', () => {
      diagnostics.clear();
      vscode.window.showInformationMessage('DotEnv diagnostics cleared.');
    }),

    vscode.commands.registerCommand('dotenvManager.openWithManager', async (uri?: vscode.Uri) => {
      const fileUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!fileUri) {
        vscode.window.showWarningMessage('No .env file selected.');
        return;
      }
      await vscode.commands.executeCommand(
        'vscode.openWith',
        fileUri,
        DotenvCustomEditorProvider.viewType
      );
    })
  ];

  registrations.forEach(r => context.subscriptions.push(r));

  // Disposables
  context.subscriptions.push(statusBar);
  context.subscriptions.push(diagnostics);

  logger.info('DotEnv Manager activated successfully.');
}

export function deactivate(): void {
  logger.info('DotEnv Manager deactivated.');
}
