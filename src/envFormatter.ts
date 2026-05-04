import { Config } from './config';
import { parseEnvContent, EnvEntry } from './envParser';

/**
 * Format .env file content according to user settings.
 */
export function formatEnvContent(text: string): string {
  const entries = parseEnvContent(text);
  const formatted: string[] = [];

  // Calculate max key length for alignment
  let maxKeyLen = 0;
  if (Config.alignValues) {
    for (const entry of entries) {
      if (entry.key && entry.key.length > maxKeyLen) {
        maxKeyLen = entry.key.length;
      }
    }
  }

  for (const entry of entries) {
    if (entry.isBlank || entry.isComment || !entry.key) {
      let line = entry.raw;
      if (Config.trimWhitespace) {
        line = line.trimEnd();
      }
      formatted.push(line);
      continue;
    }

    let line: string;
    const value = entry.value ?? '';
    const needsQuotes = value.includes(' ') || value.includes('#') || value.includes('"');
    const quotedValue = needsQuotes ? `"${value}"` : value;

    if (Config.alignValues && maxKeyLen > 0) {
      const padding = ' '.repeat(maxKeyLen - entry.key.length);
      line = `${entry.key}${padding}=${quotedValue}`;
    } else {
      line = `${entry.key}=${quotedValue}`;
    }

    if (Config.trimWhitespace) {
      line = line.trimEnd();
    }
    formatted.push(line);
  }

  let result = formatted.join('\n');

  if (Config.insertFinalNewline && !result.endsWith('\n')) {
    result += '\n';
  }

  return result;
}

/**
 * Sort .env entries alphabetically by key.
 * Comments and blanks that appear before a key are grouped with that key.
 */
export function sortEnvContent(text: string): string {
  const entries = parseEnvContent(text);

  // Group: each group is a set of preceding comments/blanks + the key entry
  interface Group {
    preamble: EnvEntry[];
    entry: EnvEntry;
  }

  const groups: Group[] = [];
  let currentPreamble: EnvEntry[] = [];

  for (const entry of entries) {
    if (entry.isBlank || entry.isComment) {
      currentPreamble.push(entry);
    } else {
      groups.push({ preamble: currentPreamble, entry });
      currentPreamble = [];
    }
  }

  // Sort groups by key
  groups.sort((a, b) => {
    const keyA = (a.entry.key ?? '').toUpperCase();
    const keyB = (b.entry.key ?? '').toUpperCase();
    return keyA.localeCompare(keyB);
  });

  const lines: string[] = [];
  for (const group of groups) {
    for (const p of group.preamble) {
      lines.push(p.raw);
    }
    lines.push(group.entry.raw);
  }

  // Append trailing blanks/comments
  for (const p of currentPreamble) {
    lines.push(p.raw);
  }

  let result = lines.join('\n');
  if (Config.insertFinalNewline && !result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}
