import { detectMagic, MAGIC_HEADER_BYTES, toHexDump, type MagicMatch } from './magic';
import { lookupExtension, lookupMimeType, normalizeExtension, type MimeEntry } from './mime-data';

export type Verdict = 'match' | 'compatible' | 'mismatch' | 'unknown';

export interface FileDetection {
  name: string;
  size: number;
  /** MIME type reported by the browser (itself extension-based, may be empty). */
  browserType: string;
  extension: string;
  byExtension: MimeEntry[];
  byContent: MagicMatch | null;
  verdict: Verdict;
  hexDump: string;
}

const ZIP_CONTAINERS = new Set([
  'zip', 'docx', 'docm', 'dotx', 'xlsx', 'xlsm', 'pptx', 'pptm', 'odt', 'ods', 'odp', 'odg', 'epub', 'jar',
  'war', 'ear', 'apk', 'aab', 'ipa', 'xpi', 'kmz', 'whl', 'nupkg', 'vsix', 'appx', 'msix', '3mf', 'sketch', 'cbz',
]);
const CFB_CONTAINERS = new Set(['doc', 'dot', 'xls', 'xlt', 'ppt', 'pps', 'pot', 'msi', 'msg', 'vsd', 'pub']);
const GZIP_CONTAINERS = new Set(['gz', 'tgz', 'gzip', 'svgz']);
const XML_BASED = /(^text\/xml$|^application\/xml$|\+xml$)/;

function isTextual(entry: MimeEntry): boolean {
  return (
    entry.group === 'text' ||
    /\+(json|xml)$/.test(entry.type) ||
    ['application/json', 'application/javascript', 'application/xml', 'application/x-sh', 'application/x-httpd-php', 'application/sql', 'application/toml', 'application/yaml'].includes(entry.type) ||
    entry.charset !== undefined
  );
}

export function compareDetection(extension: string, byExtension: MimeEntry[], byContent: MagicMatch | null): Verdict {
  if (!byContent) return 'unknown';
  if (!extension) return 'unknown';
  if (byExtension.some((entry) => entry.type === byContent.mime)) return 'match';
  if (byContent.extension === extension) return 'match';
  if (lookupMimeType(byContent.mime)?.extensions.includes(extension)) return 'match';

  if (byContent.mime === 'application/zip' && ZIP_CONTAINERS.has(extension)) return 'compatible';
  if (byContent.mime === 'application/x-cfb' && CFB_CONTAINERS.has(extension)) return 'match';
  if (byContent.mime === 'application/gzip' && GZIP_CONTAINERS.has(extension)) return 'match';
  if (byContent.mime === 'video/mp4' && ['m4a', 'm4v', 'm4b', 'm4p', 'f4v', 'mov'].includes(extension)) return 'compatible';
  if (byContent.mime === 'audio/ogg' && ['ogg', 'oga', 'opus', 'spx', 'ogv'].includes(extension)) return 'match';
  if (byContent.mime === 'application/xml' && byExtension.some((entry) => XML_BASED.test(entry.type))) return 'match';

  const contentIsText = byContent.mime.startsWith('text/') || byContent.mime === 'application/json';
  if (contentIsText && byExtension.some(isTextual)) return 'compatible';
  if (byContent.mime === 'text/plain' && byExtension.length === 0) return 'compatible';
  return 'mismatch';
}

export async function detectFile(file: File): Promise<FileDetection> {
  const buffer = await file.slice(0, MAGIC_HEADER_BYTES).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const hasExtension = file.name.includes('.') && !/^\.[^.]*$/.test(file.name);
  const extension = hasExtension ? normalizeExtension(file.name) : '';
  const byExtension = extension ? lookupExtension(extension) : [];
  const byContent = detectMagic(bytes);

  return {
    name: file.name,
    size: file.size,
    browserType: file.type,
    extension,
    byExtension,
    byContent,
    verdict: compareDetection(extension, byExtension, byContent),
    hexDump: toHexDump(bytes, 64),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
