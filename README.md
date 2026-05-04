# DotEnv Manager

A powerful .env file formatter, linter, and manager for Visual Studio Code. Sort variables, detect duplicates, mask secrets, auto-complete keys, and manage environment variables from a rich custom editor view — all without leaving your editor.

## Features

### Custom Editor View
Right-click any `.env` file and select **"Open with DotEnv Manager"** to open it in a rich management interface:

- **Visual table** of all environment variables with line numbers
- **Group by prefix** — variables are automatically grouped (e.g., `DB_*`, `API_*`)
- **Search/filter** variables instantly
- **Inline editing** — click to edit any variable's key or value
- **Add/delete** variables directly from the UI
- **Secret masking** — sensitive values are hidden by default, click to reveal
- **Duplicate detection** — highlighted with warnings
- **Sort & Format** — one-click actions from the toolbar
- **Generate .env.example** — strip values for sharing
- **Copy values** to clipboard
- **Switch to text view** at any time

### Code Intelligence
- **Auto-completion** for common environment variable names
- **Diagnostics** — real-time detection of duplicate keys and malformed lines
- **Formatting** — align values, trim whitespace, ensure final newline
- **Sorting** — alphabetical sorting with comment grouping

### Additional Tools
- **Compare .env files** — diff two .env files side by side
- **Terminal integration** — open a terminal pre-loaded with env vars
- **Status bar** — shows variable count for the active .env file

## Usage

1. Open any `.env` file in your project
2. Right-click and choose **"Open with DotEnv Manager"**
3. Or use the keyboard shortcut `Ctrl+Shift+M` / `Cmd+Shift+M`
4. Or use the Command Palette: **"DotEnv Manager: Open with DotEnv Manager"**

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `dotenvManager.trimWhitespace` | `true` | Trim trailing whitespace when formatting |
| `dotenvManager.insertFinalNewline` | `true` | Ensure file ends with a newline |
| `dotenvManager.groupByPrefix` | `true` | Group variables by prefix in the manager view |
| `dotenvManager.formatOnSave` | `false` | Auto-format on save |
| `dotenvManager.alignValues` | `false` | Align values to the same column |
| `dotenvManager.sortOnSave` | `false` | Auto-sort on save |
| `dotenvManager.maskSecrets` | `true` | Mask sensitive values |
| `dotenvManager.validateOnType` | `true` | Show diagnostics as you type |
| `dotenvManager.secretPatterns` | `["SECRET", "KEY", ...]` | Patterns indicating sensitive values |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Open with DotEnv Manager |
| `Ctrl+Shift+E` | Format .env file |
| `Ctrl+Shift+S` | Sort variables |

## Known Issues

None yet.

## Release Notes

### 4.2.0
- Added custom editor view for .env file management
- Rich UI with grouping, search, inline editing, and secret masking
- Removed sidebar panels in favor of the custom editor approach

### 4.1.0
- Initial release with formatting, linting, and sidebar management
