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

    vscode.commands.registerCommand('dotenvManager.refreshTree', () => {
      vscode.window.showInformationMessage('dotenvManager.refreshTree executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.addVariable', () => {
      vscode.window.showInformationMessage('dotenvManager.addVariable executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.removeVariable', () => {
      vscode.window.showInformationMessage('dotenvManager.removeVariable executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.editVariable', () => {
      vscode.window.showInformationMessage('dotenvManager.editVariable executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.copyValue', () => {
      vscode.window.showInformationMessage('dotenvManager.copyValue executed.');
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

    vscode.commands.registerCommand('dotenvManager.openWebview', () => {
      vscode.window.showInformationMessage('dotenvManager.openWebview executed.');
    }),

    vscode.commands.registerCommand('dotenvManager.goToVariable', () => {
      vscode.window.showInformationMessage('dotenvManager.goToVariable executed.');
    }),
  ];

  registrations.forEach(r => context.subscriptions.push(r));
}

export function deactivate() {}
