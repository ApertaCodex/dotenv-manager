import * as vscode from 'vscode';

/**
 * Manages a status bar item that shows .env file stats.
 */
export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = 'dotenvManager.showInfo';
    this.item.tooltip = 'DotEnv Manager';
  }

  /**
   * Update the status bar with variable count information.
   */
  update(variableCount: number): void {
    this.item.text = `$(symbol-key) ${variableCount} env var${variableCount !== 1 ? 's' : ''}`;
    this.item.show();
  }

  /** Hide the status bar item. */
  hide(): void {
    this.item.hide();
  }

  /** Dispose of the status bar item. */
  dispose(): void {
    this.item.dispose();
  }
}
