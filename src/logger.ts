import * as vscode from 'vscode';

/**
 * Singleton logger that writes to a VS Code OutputChannel.
 */
export class Logger {
  private static instance: Logger;
  private channel: vscode.OutputChannel;

  private constructor() {
    this.channel = vscode.window.createOutputChannel('DotEnv Manager');
  }

  /** Get the singleton Logger instance. */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /** Log an informational message. */
  info(message: string): void {
    this.channel.appendLine(`[INFO  ${this.timestamp()}] ${message}`);
  }

  /** Log a warning message. */
  warn(message: string): void {
    this.channel.appendLine(`[WARN  ${this.timestamp()}] ${message}`);
  }

  /** Log an error message. */
  error(message: string, err?: unknown): void {
    this.channel.appendLine(`[ERROR ${this.timestamp()}] ${message}`);
    if (err instanceof Error) {
      this.channel.appendLine(`  ${err.message}`);
      if (err.stack) {
        this.channel.appendLine(`  ${err.stack}`);
      }
    }
  }

  /** Show the output channel in the UI. */
  show(): void {
    this.channel.show();
  }

  /** Dispose of the output channel. */
  dispose(): void {
    this.channel.dispose();
  }

  private timestamp(): string {
    return new Date().toISOString().slice(11, 23);
  }
}
