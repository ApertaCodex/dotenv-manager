import * as vscode from 'vscode';
import { parseEnvContent } from './envParser';

/**
 * Provides auto-completion for .env files.
 * Suggests existing keys and common env variable names.
 */
export class EnvCompletionProvider implements vscode.CompletionItemProvider {
  private static readonly commonKeys = [
    'NODE_ENV', 'PORT', 'HOST', 'DATABASE_URL', 'DB_HOST', 'DB_PORT',
    'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'API_KEY', 'API_SECRET',
    'JWT_SECRET', 'JWT_EXPIRATION', 'REDIS_URL', 'REDIS_HOST', 'REDIS_PORT',
    'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD',
    'LOG_LEVEL', 'DEBUG', 'SECRET_KEY', 'SESSION_SECRET',
    'CORS_ORIGIN', 'ALLOWED_HOSTS', 'BASE_URL', 'APP_NAME',
    'SENTRY_DSN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'
  ];

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const lineText = document.lineAt(position).text;
    const items: vscode.CompletionItem[] = [];

    // Only suggest if at the start of a line (typing a key)
    if (lineText.includes('=') && position.character > lineText.indexOf('=')) {
      // Typing a value — suggest values from other files or common values
      return items;
    }

    // Collect existing keys from this document
    const entries = parseEnvContent(document.getText());
    const existingKeys = new Set(entries.filter(e => e.key).map(e => e.key!));

    // Suggest common keys that aren't already defined
    for (const key of EnvCompletionProvider.commonKeys) {
      if (!existingKeys.has(key)) {
        const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable);
        item.insertText = new vscode.SnippetString(`${key}=\${1:value}`);
        item.detail = 'Common env variable';
        item.documentation = `Add ${key} environment variable`;
        items.push(item);
      }
    }

    return items;
  }
}
