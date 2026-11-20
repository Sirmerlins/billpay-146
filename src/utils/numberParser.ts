export const TOTAL_PEOPLE = 146;

export interface ParsedInputResult {
  validNumbers: number[];
  outOfRange: number[];
  invalidTokens: string[];
}

export function parseNumberInput(raw: string, max: number = TOTAL_PEOPLE): ParsedInputResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { validNumbers: [], outOfRange: [], invalidTokens: [] };
  }

  const tokens = trimmed.split(/[\s,;]+/).filter(Boolean);
  const validSet = new Set<number>();
  const outOfRangeSet = new Set<number>();
  const invalidTokens: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.replace(/^#/, '');

    // Range pattern: e.g. 10-15 or 10..15
    const rangeMatch = token.match(/^(\d+)(?:-|\.\.)(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const low = Math.min(start, end);
      const high = Math.max(start, end);

      // Guard against absurdly huge ranges like 1-999999999
      if (high - low > 1000 && (low < 1 || high > max)) {
        invalidTokens.push(rawToken);
        continue;
      }

      for (let n = low; n <= high; n++) {
        if (n >= 1 && n <= max) {
          validSet.add(n);
        } else {
          outOfRangeSet.add(n);
        }
      }
      continue;
    }

    // Single integer pattern
    if (/^\d+$/.test(token)) {
      const num = Number(token);
      if (num >= 1 && num <= max) {
        validSet.add(num);
      } else {
        outOfRangeSet.add(num);
      }
      continue;
    }

    invalidTokens.push(rawToken);
  }

  return {
    validNumbers: Array.from(validSet),
    outOfRange: Array.from(outOfRangeSet),
    invalidTokens,
  };
}
