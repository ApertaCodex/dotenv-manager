import * as vscode from 'vscode';
import { Logger } from './logger';

const logger = Logger.getInstance();

/**
 * Open a terminal pre-loaded with environment variables from the given URI.
 */
export async function openEnvTerminal(uri?: vscode.Uri): Promise<void> {
  try {
    const fileUri = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (!fileUri) {
      vscode.window.showWarningMessage('No .env file is currently open.');
      return;
    }

    const doc = await vscode.workspace.openTextDocument(fileUri);
    const text = doc.getText();
    const env: Record<string, string> = {};

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) { continue; }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) { continue; }
      const key = trimmed.substring(0, eqIdx).trim();
      let value = trimmed.substring(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }

    const terminal = vscode.window.createTerminal({
      name: `Env: ${fileUri.path.split('/').pop()}`,
      env
    });
    terminal.show();
    logger.info(`Opened terminal with ${Object.keys(env).length} env vars from ${fileUri.fsPath}`);
  } catch (err) {
    logger.error('Failed to open env terminal', err);
    vscode.window.showErrorMessage('Failed to open terminal with env vars.');
  }
}
