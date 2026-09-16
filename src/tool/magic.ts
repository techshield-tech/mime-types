// File-type detection from leading "magic" bytes. Covers the formats people
// most often need to verify; anything else falls back to a text/binary guess.

export interface MagicMatch {
  mime: string;
  name: string;
  /** Typical extension for the detected format. */
  extension: string;
}

/** How many leading bytes `detectMagic` needs to see. */
export const MAGIC_HEADER_BYTES = 4100;

type Pattern = (number | null)[];

function matches(bytes: Uint8Array, pattern: Pattern, offset = 0): boolean {
  if (bytes.length < offset + pattern.length) return false;
  return pattern.every((value, i) => value === null || bytes[offset + i] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = '';
  for (let i = start; i < Math.min(bytes.length, start + length); i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function hasAscii(bytes: Uint8Array, text: string, offset = 0): boolean {
  return ascii(bytes, offset, text.length) === text;
}

const m = (mime: string, name: string, extension: string): MagicMatch => ({ mime, name, extension });

const FTYP_BRANDS: [RegExp, MagicMatch][] = [
  [/^avi[fs]/, m('image/avif', 'AVIF image', 'avif')],
  [/^(heic|heix|hevc|hevx)/, m('image/heic', 'HEIC image', 'heic')],
  [/^(mif1|msf1)/, m('image/heif', 'HEIF image', 'heif')],
  [/^qt {2}/, m('video/quicktime', 'QuickTime video', 'mov')],
  [/^M4A /, m('audio/mp4', 'MPEG-4 audio', 'm4a')],
  [/^M4B /, m('audio/mp4', 'MPEG-4 audiobook', 'm4b')],
  [/^M4V/, m('video/x-m4v', 'MPEG-4 video (iTunes)', 'm4v')],
  [/^3g2/, m('video/3gpp2', '3GPP2 video', '3g2')],
  [/^3g/, m('video/3gpp', '3GPP video', '3gp')],
  [/^crx /, m('image/x-canon-cr3', 'Canon CR3 raw image', 'cr3')],
];

function detectFtyp(bytes: Uint8Array): MagicMatch | null {
  if (!hasAscii(bytes, 'ftyp', 4)) return null;
  const brand = ascii(bytes, 8, 4);
  for (const [pattern, match] of FTYP_BRANDS) {
    if (pattern.test(brand)) return match;
  }
  return m('video/mp4', 'MPEG-4 video', 'mp4');
}

function detectZip(bytes: Uint8Array): MagicMatch {
  // The first local file header's name hints at OOXML / ODF / EPUB / JAR / APK.
  const nameLength = bytes[26] | (bytes[27] << 8);
  const firstName = ascii(bytes, 30, nameLength);
  if (firstName === 'mimetype') {
    const extraLength = bytes[28] | (bytes[29] << 8);
    const declared = ascii(bytes, 30 + nameLength + extraLength, 80);
    if (declared.startsWith('application/epub+zip')) return m('application/epub+zip', 'EPUB e-book', 'epub');
    const odf: [string, MagicMatch][] = [
      ['application/vnd.oasis.opendocument.text', m('application/vnd.oasis.opendocument.text', 'OpenDocument text', 'odt')],
      ['application/vnd.oasis.opendocument.spreadsheet', m('application/vnd.oasis.opendocument.spreadsheet', 'OpenDocument spreadsheet', 'ods')],
      ['application/vnd.oasis.opendocument.presentation', m('application/vnd.oasis.opendocument.presentation', 'OpenDocument presentation', 'odp')],
      ['application/vnd.oasis.opendocument.graphics', m('application/vnd.oasis.opendocument.graphics', 'OpenDocument drawing', 'odg')],
    ];
    for (const [prefix, match] of odf) {
      if (declared.startsWith(prefix)) return match;
    }
  }
  const head = ascii(bytes, 0, bytes.length);
  if (firstName === '[Content_Types].xml' || firstName.startsWith('_rels/') || /word\/|xl\/|ppt\//.test(head)) {
    if (head.includes('word/')) return m('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word document (DOCX)', 'docx');
    if (head.includes('xl/')) return m('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel workbook (XLSX)', 'xlsx');
    if (head.includes('ppt/')) return m('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'PowerPoint presentation (PPTX)', 'pptx');
  }
  if (firstName === 'META-INF/MANIFEST.MF' || firstName === 'META-INF/') return m('application/java-archive', 'Java archive (JAR)', 'jar');
  if (firstName === 'AndroidManifest.xml' || head.includes('classes.dex')) {
    return m('application/vnd.android.package-archive', 'Android package (APK)', 'apk');
  }
  return m('application/zip', 'ZIP archive', 'zip');
}

function detectText(bytes: Uint8Array): MagicMatch | null {
  if (bytes.length === 0) return null;
  let start = 0;
  if (matches(bytes, [0xef, 0xbb, 0xbf])) start = 3;
  else if (matches(bytes, [0xff, 0xfe]) || matches(bytes, [0xfe, 0xff])) {
    return m('text/plain', 'UTF-16 text', 'txt');
  }

  const body = bytes.subarray(start);
  // Drop a possibly truncated multi-byte sequence at the end of the sample.
  let end = body.length;
  for (let i = body.length - 1; i >= Math.max(0, body.length - 4); i--) {
    if ((body[i] & 0xc0) !== 0x80) {
      if (body[i] >= 0xc0) end = i;
      break;
    }
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(body.subarray(0, end));
  } catch {
    return null;
  }
  if (/[\x00-\x08\x0e-\x1a\x1c-\x1f]/.test(text)) return null;

  const trimmed = text.trimStart();
  const lower = trimmed.slice(0, 512).toLowerCase();
  if (lower.startsWith('<?xml')) {
    if (/<svg[\s>]/.test(lower)) return m('image/svg+xml', 'SVG image', 'svg');
    if (/<rss[\s>]/.test(lower)) return m('application/rss+xml', 'RSS feed', 'rss');
    if (/<feed[\s>]/.test(lower)) return m('application/atom+xml', 'Atom feed', 'atom');
    return m('application/xml', 'XML document', 'xml');
  }
  if (/^<svg[\s>]/.test(lower)) return m('image/svg+xml', 'SVG image', 'svg');
  if (/^(<!doctype html|<html[\s>]|<head[\s>]|<body[\s>])/.test(lower)) return m('text/html', 'HTML document', 'html');
  if (trimmed.startsWith('{\\rtf')) return m('application/rtf', 'Rich Text Format', 'rtf');
  if (trimmed.startsWith('%!PS')) return m('application/postscript', 'PostScript', 'ps');
  if (trimmed.startsWith('#!')) return m('text/x-shellscript', 'Script (shebang)', 'sh');
  if (/^[[{]/.test(trimmed)) {
    try {
      JSON.parse(text);
      return m('application/json', 'JSON document', 'json');
    } catch {
      // Might just be truncated; fall through to plain text.
    }
  }
  return m('text/plain', start ? 'UTF-8 text (with BOM)' : 'Plain text', 'txt');
}

export function detectMagic(bytes: Uint8Array): MagicMatch | null {
  const b = bytes;
  if (matches(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return m('image/png', 'PNG image', 'png');
  if (matches(b, [0xff, 0xd8, 0xff])) return m('image/jpeg', 'JPEG image', 'jpg');
  if (hasAscii(b, 'GIF87a') || hasAscii(b, 'GIF89a')) return m('image/gif', 'GIF image', 'gif');
  if (hasAscii(b, 'RIFF')) {
    const kind = ascii(b, 8, 4);
    if (kind === 'WEBP') return m('image/webp', 'WebP image', 'webp');
    if (kind === 'WAVE') return m('audio/wav', 'WAV audio', 'wav');
    if (kind === 'AVI ') return m('video/x-msvideo', 'AVI video', 'avi');
  }
  if (hasAscii(b, 'BM') && b.length >= 26 && b[14] >= 12 && b[15] === 0 && b[16] === 0) {
    return m('image/bmp', 'BMP image', 'bmp');
  }
  if (matches(b, [0x00, 0x00, 0x01, 0x00]) && b.length >= 6 && b[4] > 0) return m('image/vnd.microsoft.icon', 'ICO icon', 'ico');
  if (matches(b, [0x00, 0x00, 0x02, 0x00]) && b.length >= 6 && b[4] > 0) return m('image/x-icon', 'CUR cursor', 'cur');
  if (matches(b, [0x49, 0x49, 0x2a, 0x00]) || matches(b, [0x4d, 0x4d, 0x00, 0x2a])) return m('image/tiff', 'TIFF image', 'tif');
  if (hasAscii(b, '8BPS')) return m('image/vnd.adobe.photoshop', 'Photoshop document', 'psd');
  if (matches(b, [0x00, 0x00, 0x00, 0x0c, 0x6a, 0x58, 0x4c, 0x20]) || matches(b, [0xff, 0x0a])) return m('image/jxl', 'JPEG XL image', 'jxl');
  if (hasAscii(b, 'qoif')) return m('image/qoi', 'QOI image', 'qoi');

  const ftyp = detectFtyp(b);
  if (ftyp) return ftyp;

  if (hasAscii(b, '%PDF-')) return m('application/pdf', 'PDF document', 'pdf');
  if (matches(b, [0x50, 0x4b, 0x03, 0x04])) return detectZip(b);
  if (matches(b, [0x50, 0x4b, 0x05, 0x06])) return m('application/zip', 'ZIP archive (empty)', 'zip');
  if (matches(b, [0x1f, 0x8b])) return m('application/gzip', 'Gzip archive', 'gz');
  if (hasAscii(b, 'BZh')) return m('application/x-bzip2', 'Bzip2 archive', 'bz2');
  if (matches(b, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return m('application/x-xz', 'XZ archive', 'xz');
  if (matches(b, [0x28, 0xb5, 0x2f, 0xfd])) return m('application/zstd', 'Zstandard archive', 'zst');
  if (matches(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return m('application/x-7z-compressed', '7-Zip archive', '7z');
  if (hasAscii(b, 'Rar!\x1a\x07')) return m('application/vnd.rar', 'RAR archive', 'rar');
  if (hasAscii(b, 'ustar', 257)) return m('application/x-tar', 'TAR archive', 'tar');
  if (matches(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return m('application/x-cfb', 'Compound File (legacy Office DOC/XLS/PPT, MSI)', 'doc');
  }
  if (hasAscii(b, 'SQLite format 3\x00')) return m('application/vnd.sqlite3', 'SQLite database', 'sqlite');

  if (hasAscii(b, 'ID3') || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe6) === 0xe2)) {
    return m('audio/mpeg', 'MP3 audio', 'mp3');
  }
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xf6) === 0xf0) return m('audio/aac', 'AAC audio (ADTS)', 'aac');
  if (hasAscii(b, 'OggS')) {
    const head = ascii(b, 28, 8);
    if (head.startsWith('OpusHead')) return m('audio/ogg', 'Ogg Opus audio', 'opus');
    if (head.includes('theora')) return m('video/ogg', 'Ogg Theora video', 'ogv');
    return m('audio/ogg', 'Ogg audio', 'ogg');
  }
  if (hasAscii(b, 'fLaC')) return m('audio/flac', 'FLAC audio', 'flac');
  if (hasAscii(b, 'MThd')) return m('audio/midi', 'MIDI audio', 'mid');
  if (hasAscii(b, 'FORM') && (hasAscii(b, 'AIFF', 8) || hasAscii(b, 'AIFC', 8))) return m('audio/aiff', 'AIFF audio', 'aiff');
  if (matches(b, [0x1a, 0x45, 0xdf, 0xa3])) {
    return ascii(b, 0, 64).includes('webm') ? m('video/webm', 'WebM video', 'webm') : m('video/x-matroska', 'Matroska video', 'mkv');
  }
  if (hasAscii(b, 'FLV')) return m('video/x-flv', 'Flash video', 'flv');
  if (matches(b, [0x00, 0x00, 0x01, 0xba]) || matches(b, [0x00, 0x00, 0x01, 0xb3])) return m('video/mpeg', 'MPEG video', 'mpg');
  if (b.length >= 189 && b[0] === 0x47 && b[188] === 0x47) return m('video/mp2t', 'MPEG transport stream', 'ts');

  if (hasAscii(b, 'wOFF')) return m('font/woff', 'WOFF font', 'woff');
  if (hasAscii(b, 'wOF2')) return m('font/woff2', 'WOFF2 font', 'woff2');
  if (hasAscii(b, 'OTTO')) return m('font/otf', 'OpenType font', 'otf');
  if (matches(b, [0x00, 0x01, 0x00, 0x00, 0x00])) return m('font/ttf', 'TrueType font', 'ttf');
  if (hasAscii(b, 'ttcf')) return m('font/collection', 'Font collection', 'ttc');

  if (matches(b, [0x00, 0x61, 0x73, 0x6d])) return m('application/wasm', 'WebAssembly module', 'wasm');
  if (matches(b, [0x7f, 0x45, 0x4c, 0x46])) return m('application/x-elf', 'ELF executable', 'elf');
  if (hasAscii(b, 'MZ')) return m('application/vnd.microsoft.portable-executable', 'Windows executable (PE/DOS)', 'exe');
  if (
    matches(b, [0xcf, 0xfa, 0xed, 0xfe]) ||
    matches(b, [0xce, 0xfa, 0xed, 0xfe]) ||
    matches(b, [0xfe, 0xed, 0xfa, 0xcf]) ||
    matches(b, [0xfe, 0xed, 0xfa, 0xce])
  ) {
    return m('application/x-mach-binary', 'Mach-O binary', 'macho');
  }
  if (matches(b, [0xca, 0xfe, 0xba, 0xbe])) {
    // Java class files store a major version >= 45 here; fat Mach-O stores a small arch count.
    const value = (b[6] << 8) | b[7];
    return value >= 45
      ? m('application/java-vm', 'Java class file', 'class')
      : m('application/x-mach-binary', 'Mach-O universal binary', 'macho');
  }
  if (hasAscii(b, 'dex\n')) return m('application/vnd.android.dex', 'Dalvik executable', 'dex');
  if (hasAscii(b, '!<arch>\n')) {
    return hasAscii(b, 'debian-binary', 8)
      ? m('application/vnd.debian.binary-package', 'Debian package', 'deb')
      : m('application/x-archive', 'Unix archive', 'a');
  }
  if (matches(b, [0xed, 0xab, 0xee, 0xdb])) return m('application/x-rpm', 'RPM package', 'rpm');

  return detectText(b);
}

export function toHexDump(bytes: Uint8Array, length = 64): string {
  const lines: string[] = [];
  const max = Math.min(bytes.length, length);
  for (let offset = 0; offset < max; offset += 16) {
    const row = bytes.subarray(offset, Math.min(offset + 16, max));
    const hex = [...row].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
    const text = [...row].map((byte) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.')).join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex.padEnd(47)}  ${text}`);
  }
  return lines.join('\n');
}
