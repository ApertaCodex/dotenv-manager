/**
 * Represents a single parsed line from a .env file.
 */
export interface EnvEntry {
  /** The line number (0-based) in the original file. */
  lineNumber: number;
  /** The raw text of the line. */
  raw: string;
  /** The variable key, or undefined for comments/blank lines. */
  key?: string;
  /** The variable value, or undefined for comments/blank lines. */
  value?: string;
  /** Whether this line is a comment. */
  isComment: boolean;
  /** Whether this line is blank. */
  isBlank: boolean;
}

/**
 * Parse the text content of a .env file into structured entries.
 */
export function parseEnvContent(text: string): EnvEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: EnvEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === '') {
      entries.push({ lineNumber: i, raw, isComment: false, isBlank: true });
      continue;
    }

    if (trimmed.startsWith('#')) {
      entries.push({ lineNumber: i, raw, isComment: true, isBlank: false });
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) {
      // Malformed line — treat as comment-like
      entries.push({ lineNumber: i, raw, isComment: false, isBlank: false });
      continue;
    }

    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries.push({ lineNumber: i, raw, key, value, isComment: false, isBlank: false });
  }

  return entries;
}

/**
 * Serialize entries back to .env text content.
 */
export function serializeEntries(entries: EnvEntry[]): string {
  return entries.map(e => e.raw).join('\n');
}

/**
 * Find duplicate keys in a set of entries.
 * Returns a map of key -> array of line numbers where it appears.
 */
export function findDuplicates(entries: EnvEntry[]): Map<string, number[]> {
  const seen = new Map<string, number[]>();
  for (const entry of entries) {
    if (entry.key) {
      const existing = seen.get(entry.key) ?? [];
      existing.push(entry.lineNumber);
      seen.set(entry.key, existing);
    }
  }

  const duplicates = new Map<string, number[]>();
  for (const [key, lines] of seen) {
    if (lines.length > 1) {
      duplicates.set(key, lines);
    }
  }
  return duplicates;
}

/**
 * Check if a variable key matches any secret pattern.
 */
export function isSecretKey(key: string, patterns: string[]): boolean {
  const upper = key.toUpperCase();
  return patterns.some(p => upper.includes(p.toUpperCase()));
}
