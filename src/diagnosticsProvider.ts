import * as vscode from 'vscode';
import { parseEnvContent, findDuplicates } from './envParser';
import { Logger } from './logger';

const logger = Logger.getInstance();

/**
 * Manages diagnostics for .env files (duplicate keys, malformed lines).
 */
export class DiagnosticsProvider {
  private collection: vscode.DiagnosticCollection;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('dotenvManager');
  }

  /**
   * Analyze a text document and update diagnostics.
   */
  update(document: vscode.TextDocument): void {
    if (document.languageId !== 'dotenv') {
      return;
    }

    try {
      const text = document.getText();
      const entries = parseEnvContent(text);
      const diagnostics: vscode.Diagnostic[] = [];

      // Check for duplicates
      const dupes = findDuplicates(entries);
      for (const [key, lines] of dupes) {
        for (const lineNum of lines) {
          const line = document.lineAt(lineNum);
          const range = new vscode.Range(lineNum, 0, lineNum, line.text.length);
          const diag = new vscode.Diagnostic(
            range,
            `Duplicate key: "${key}" (appears ${lines.length} times)`,
            vscode.DiagnosticSeverity.Warning
          );
          diag.source = 'DotEnv Manager';
          diagnostics.push(diag);
        }
      }

      // Check for malformed lines
      for (const entry of entries) {
        if (!entry.isBlank && !entry.isComment && !entry.key) {
          const line = document.lineAt(entry.lineNumber);
          const range = new vscode.Range(entry.lineNumber, 0, entry.lineNumber, line.text.length);
          const diag = new vscode.Diagnostic(
            range,
            `Malformed line: expected KEY=VALUE format`,
            vscode.DiagnosticSeverity.Error
          );
          diag.source = 'DotEnv Manager';
          diagnostics.push(diag);
        }

        // Check for keys with spaces
        if (entry.key && entry.key.includes(' ')) {
          const line = document.lineAt(entry.lineNumber);
          const range = new vscode.Range(entry.lineNumber, 0, entry.lineNumber, line.text.length);
          const diag = new vscode.Diagnostic(
            range,
            `Key "${entry.key}" contains spaces — this may cause issues`,
            vscode.DiagnosticSeverity.Warning
          );
          diag.source = 'DotEnv Manager';
          diagnostics.push(diag);
        }
      }

      this.collection.set(document.uri, diagnostics);
    } catch (err) {
      logger.error('Failed to update diagnostics', err);
    }
  }

  /** Clear all diagnostics. */
  clear(): void {
    this.collection.clear();
  }

  /** Dispose of the diagnostic collection. */
  dispose(): void {
    this.collection.dispose();
  }
}
