import db from 'mime-db';

export type MimeSource = 'iana' | 'apache' | 'nginx';

export interface MimeEntry {
  type: string;
  /** Top-level type, e.g. `image` for `image/png`. */
  group: string;
  extensions: string[];
  source?: MimeSource;
  charset?: string;
  compressible?: boolean;
}

export const MIME_ENTRIES: MimeEntry[] = Object.entries(db)
  .map(([type, info]) => ({
    type,
    group: type.slice(0, type.indexOf('/')),
    extensions: info.extensions ? [...info.extensions] : [],
    source: info.source,
    charset: info.charset,
    compressible: info.compressible,
  }))
  .sort((a, b) => a.type.localeCompare(b.type));

const entryByType = new Map(MIME_ENTRIES.map((entry) => [entry.type, entry]));

export const MIME_GROUPS: string[] = [...new Set(MIME_ENTRIES.map((entry) => entry.group))].sort();

const FACET_SCORES: Record<string, number> = { 'prs.': 100, 'x-': 200, 'x.': 300, 'vnd.': 400 };
const SOURCE_SCORES: Record<string, number> = { nginx: 10, apache: 20, iana: 40 };
const TYPE_SCORES: Record<string, number> = { application: 1, font: 2, audio: 2, video: 3 };

/** Same ranking the `mime-types` package uses to pick one type when several claim an extension. */
function mimeScore(entry: MimeEntry): number {
  if (entry.type === 'application/octet-stream') return 0;
  const subtype = entry.type.slice(entry.group.length + 1);
  const facet = /^(prs\.|x-|x\.|vnd\.)/.exec(subtype)?.[1];
  const facetScore = (facet && FACET_SCORES[facet]) || 900;
  const sourceScore = (entry.source && SOURCE_SCORES[entry.source]) || 30;
  const typeScore = TYPE_SCORES[entry.group] ?? 0;
  return facetScore + sourceScore + typeScore + (1 - entry.type.length / 100);
}

// extension -> MIME entries, preferred first
const typesByExtension = new Map<string, MimeEntry[]>();
for (const entry of MIME_ENTRIES) {
  for (const ext of entry.extensions) {
    const list = typesByExtension.get(ext);
    if (list) list.push(entry);
    else typesByExtension.set(ext, [entry]);
  }
}
for (const list of typesByExtension.values()) {
  list.sort((a, b) => mimeScore(b) - mimeScore(a));
}

export const ALL_EXTENSIONS: string[] = [...typesByExtension.keys()].sort();

export const STATS = {
  types: MIME_ENTRIES.length,
  typesWithExtensions: MIME_ENTRIES.filter((entry) => entry.extensions.length > 0).length,
  extensions: ALL_EXTENSIONS.length,
};

/** Accepts `png`, `.PNG`, `photo.png` or a path; returns the bare lower-case extension. */
export function normalizeExtension(input: string): string {
  const trimmed = input.trim().toLowerCase().replace(/[?#].*$/, '');
  const name = trimmed.slice(Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\')) + 1);
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : name;
}

/** Strips parameters (`; charset=utf-8`) and whitespace and lower-cases a MIME type. */
export function normalizeMimeType(input: string): string {
  return input.split(';')[0].trim().toLowerCase();
}

export function lookupExtension(input: string): MimeEntry[] {
  return typesByExtension.get(normalizeExtension(input)) ?? [];
}

export function lookupMimeType(input: string): MimeEntry | undefined {
  return entryByType.get(normalizeMimeType(input));
}

/**
 * Scores how well `query` matches `target`: substring matches rank highest
 * (earlier and whole-word is better), then in-order subsequence matches with
 * a penalty for gaps. Returns null when the query does not match at all.
 */
export function fuzzyScore(query: string, target: string): number | null {
  if (!query) return 0;
  const index = target.indexOf(query);
  if (index >= 0) {
    let score = 1000 - index - (target.length - query.length) * 0.5;
    if (index === 0 || /[/.+\-_]/.test(target[index - 1])) score += 200;
    if (query === target) score += 1000;
    return score;
  }
  let score = 0;
  let first = -1;
  let last = -1;
  for (const char of query) {
    const next = target.indexOf(char, last + 1);
    if (next < 0) return null;
    if (first < 0) first = next;
    score -= last < 0 ? next * 0.5 : (next - last - 1) * 2;
    last = next;
  }
  // Letters scattered across the whole string are noise, not a match.
  if (last - first + 1 > query.length * 2 + 2) return null;
  return 500 + score - (target.length - query.length) * 0.5;
}

export interface SearchOptions {
  group?: string;
  onlyWithExtensions?: boolean;
}

export function searchEntries(query: string, { group, onlyWithExtensions }: SearchOptions = {}): MimeEntry[] {
  const tokens = query.trim().toLowerCase().replace(/^\./, '').split(/\s+/).filter(Boolean);
  const results: { entry: MimeEntry; score: number }[] = [];

  for (const entry of MIME_ENTRIES) {
    if (group && entry.group !== group) continue;
    if (onlyWithExtensions && entry.extensions.length === 0) continue;
    let total = 0;
    let matched = true;
    for (const token of tokens) {
      const bare = token.replace(/^\./, '');
      let best = fuzzyScore(token, entry.type);
      for (const ext of entry.extensions) {
        const extScore = fuzzyScore(bare, ext);
        if (extScore !== null) {
          const boosted = extScore + (bare === ext ? 1500 : 100);
          if (best === null || boosted > best) best = boosted;
        }
      }
      if (best === null) {
        matched = false;
        break;
      }
      total += best;
    }
    if (matched) results.push({ entry, score: total });
  }

  if (tokens.length > 0) results.sort((a, b) => b.score - a.score);
  return results.map((result) => result.entry);
}

export function groupEntries(entries: MimeEntry[]): { group: string; entries: MimeEntry[] }[] {
  const groups = new Map<string, MimeEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.group);
    if (list) list.push(entry);
    else groups.set(entry.group, [entry]);
  }
  return [...groups].map(([group, list]) => ({ group, entries: list }));
}

export function suggestExtensions(input: string, limit = 8): string[] {
  const query = normalizeExtension(input);
  if (!query) return [];
  return ALL_EXTENSIONS.map((ext) => ({ ext, score: fuzzyScore(query, ext) }))
    .filter((item): item is { ext: string; score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.ext);
}
