import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('DotEnv Manager');
  context.subscriptions.push(output);
  output.appendLine('DotEnv Manager activated');

  const registrations = [
    vscode.commands.registerCommand('dotenvManager.showInfo', () => {
      vscode.window.showInformationMessage('dotenvManager.showInfo executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.openTerminal', () => {
      vscode.window.showInformationMessage('dotenvManager.openTerminal executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.sortVariables', () => {
      vscode.window.showInformationMessage('dotenvManager.sortVariables executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.formatFile', () => {
      vscode.window.showInformationMessage('dotenvManager.formatFile executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.detectDuplicates', () => {
      vscode.window.showInformationMessage('dotenvManager.detectDuplicates executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.toggleSecretMask', () => {
      vscode.window.showInformationMessage('dotenvManager.toggleSecretMask executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.generateExample', () => {
      vscode.window.showInformationMessage('dotenvManager.generateExample executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.compareEnvFiles', () => {
      vscode.window.showInformationMessage('dotenvManager.compareEnvFiles executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.clearDiagnostics', () => {
      vscode.window.showInformationMessage('dotenvManager.clearDiagnostics executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.openWithManager', () => {
      vscode.window.showInformationMessage('dotenvManager.openWithManager executed.');
    }),
  ];

  registrations.forEach(r => context.subscriptions.push(r));
}

export function deactivate() {}
