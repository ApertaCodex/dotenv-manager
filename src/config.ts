import * as vscode from 'vscode';

const SECTION = 'dotenvManager';

/**
 * Typed configuration wrapper for dotenvManager settings.
 */
export class Config {
  private static get cfg(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(SECTION);
  }

  static get trimWhitespace(): boolean {
    return this.cfg.get<boolean>('trimWhitespace', true);
  }

  static get insertFinalNewline(): boolean {
    return this.cfg.get<boolean>('insertFinalNewline', true);
  }

  static get groupByPrefix(): boolean {
    return this.cfg.get<boolean>('groupByPrefix', true);
  }

  static get formatOnSave(): boolean {
    return this.cfg.get<boolean>('formatOnSave', false);
  }

  static get alignValues(): boolean {
    return this.cfg.get<boolean>('alignValues', false);
  }

  static get sortOnSave(): boolean {
    return this.cfg.get<boolean>('sortOnSave', false);
  }

  static get maskSecrets(): boolean {
    return this.cfg.get<boolean>('maskSecrets', true);
  }

  static get validateOnType(): boolean {
    return this.cfg.get<boolean>('validateOnType', true);
  }

  static get secretPatterns(): string[] {
    return this.cfg.get<string[]>('secretPatterns', [
      'SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'PRIVATE', 'CREDENTIAL', 'AUTH'
    ]);
  }
}
