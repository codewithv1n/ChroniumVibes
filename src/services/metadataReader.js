/**
 * VinVibes — Audio tag reader
 *
 * Reads embedded metadata directly from local audio files, entirely
 * on-device:
 *   - MP3:      ID3v2.2 / 2.3 / 2.4 (title, artist, album, artwork, lyrics)
 *   - M4A/AAC:  MP4 'ilst' atoms
 *   - FLAC:     Vorbis comments + PICTURE block
 * Other formats (OGG, WAV, ...) fall back to file-name parsing.
 *
 * Every function returns null instead of throwing, so one corrupted
 * file can never break a library scan.
 */

import { File, FileMode } from 'expo-file-system';

const MAX_TAG_BYTES = 8 * 1024 * 1024;

// ── Byte helpers ──────────────────────────────────────────────

function openReader(uri) {
  const file = new File(uri);
  const handle = file.open(FileMode.ReadOnly);
  const size = handle.size ?? file.size ?? 0;
  return {
    size,
    read(offset, length) {
      handle.offset = offset;
      return handle.readBytes(Math.max(0, Math.min(length, size - offset)));
    },
    close() {
      try { handle.close(); } catch (e) { /* already closed */ }
    },
  };
}

function ascii(bytes, start, length) {
  let out = '';
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

const be32 = (b, o) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const le32 = (b, o) => b[o] + (b[o + 1] << 8) + (b[o + 2] << 16) + ((b[o + 3] << 24) >>> 0);
const syncsafe = (b, o) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];

function decodeLatin1(bytes, start = 0, end = bytes.length) {
  let out = '';
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

function decodeUtf8(bytes, start = 0, end = bytes.length) {
  let out = '';
  let i = start;
  while (i < end) {
    const c = bytes[i++];
    if (c < 0x80) {
      out += String.fromCharCode(c);
    } else if (c >= 0xc0 && c < 0xe0) {
      out += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (c >= 0xe0 && c < 0xf0) {
      out += String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    } else if (c >= 0xf0) {
      const cp = ((c & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      out += String.fromCodePoint(cp);
    }
  }
  return out;
}

function decodeUtf16(bytes, start, end, littleEndian) {
  let i = start;
  let le = littleEndian;
  if (end - start >= 2) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xfe) { le = true; i += 2; }
    else if (bytes[i] === 0xfe && bytes[i + 1] === 0xff) { le = false; i += 2; }
  }
  let out = '';
  for (; i + 1 < end; i += 2) {
    out += String.fromCharCode(le ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
  }
  return out;
}

/** Decode ID3 text in the given encoding (0 latin1, 1 utf16+BOM, 2 utf16be, 3 utf8). */
function decodeText(bytes, encoding, start = 0, end = bytes.length) {
  switch (encoding) {
    case 1: return decodeUtf16(bytes, start, end, true);
    case 2: return decodeUtf16(bytes, start, end, false);
    case 3: return decodeUtf8(bytes, start, end);
    default: return decodeLatin1(bytes, start, end);
  }
}

/** Find the end of a null-terminated string; returns [endIndex, nextIndex]. */
function findTerminator(bytes, start, encoding) {
  const wide = encoding === 1 || encoding === 2;
  if (wide) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return [i, i + 2];
    }
  } else {
    for (let i = start; i < bytes.length; i++) {
      if (bytes[i] === 0) return [i, i + 1];
    }
  }
  return [bytes.length, bytes.length];
}

function cleanText(text) {
  if (!text) return '';
  // ID3v2.4 allows multiple values separated by NUL; keep the first.
  return text.split('\u0000')[0].replace(/﻿/g, '').trim();
}

function removeUnsync(bytes) {
  const out = new Uint8Array(bytes.length);
  let j = 0;
  for (let i = 0; i < bytes.length; i++) {
    out[j++] = bytes[i];
    if (bytes[i] === 0xff && bytes[i + 1] === 0x00) i++;
  }
  return out.subarray(0, j);
}

function mimeFromBytes(bytes, fallback = 'image/jpeg') {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  return fallback;
}

function parseTrackNumber(value) {
  const n = parseInt(String(value || '').split('/')[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseYear(value) {
  const match = String(value || '').match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

// ── ID3v2 ─────────────────────────────────────────────────────

const ID3_FIELDS = {
  TIT2: 'title', TT2: 'title',
  TPE1: 'artist', TP1: 'artist',
  TPE2: 'albumArtist', TP2: 'albumArtist',
  TALB: 'album', TAL: 'album',
  TRCK: 'track', TRK: 'track',
  TYER: 'year', TYE: 'year', TDRC: 'year',
  TCON: 'genre', TCO: 'genre',
};

function readId3(reader, options) {
  const header = reader.read(0, 10);
  if (ascii(header, 0, 3) !== 'ID3') return null;

  const major = header[3];
  const flags = header[5];
  const tagSize = syncsafe(header, 6);
  const totalSize = 10 + tagSize + (flags & 0x10 ? 10 : 0);
  if (major < 2 || major > 4 || tagSize <= 0 || tagSize > MAX_TAG_BYTES) {
    return { tags: {}, tagEnd: totalSize };
  }

  let body = reader.read(10, tagSize);
  if (flags & 0x80 && major < 4) body = removeUnsync(body);

  let pos = 0;
  if (flags & 0x40) {
    // Skip the extended header.
    const extSize = major === 4 ? syncsafe(body, 0) : be32(body, 0) + 4;
    pos = extSize;
  }

  const tags = {};
  const idLength = major === 2 ? 3 : 4;
  const headerLength = major === 2 ? 6 : 10;

  while (pos + headerLength <= body.length) {
    const id = ascii(body, pos, idLength);
    if (!/^[A-Z0-9]+$/.test(id)) break; // padding reached

    let frameSize;
    if (major === 2) frameSize = (body[pos + 3] << 16) | (body[pos + 4] << 8) | body[pos + 5];
    else if (major === 4) frameSize = syncsafe(body, pos + 4);
    else frameSize = be32(body, pos + 4);

    const formatFlags = major === 2 ? 0 : body[pos + 9];
    let dataStart = pos + headerLength;
    const dataEnd = dataStart + frameSize;
    if (frameSize <= 0 || dataEnd > body.length) break;
    pos = dataEnd;

    // Skip compressed / encrypted frames (v2.4: 0x08 / 0x04, v2.3: 0x80 / 0x40).
    if (major === 4 && formatFlags & 0x0c) continue;
    if (major === 3 && formatFlags & 0xc0) continue;
    if (major === 4 && formatFlags & 0x01) dataStart += 4; // data length indicator

    let data = body.subarray(dataStart, dataEnd);
    if (major === 4 && formatFlags & 0x02) data = removeUnsync(data);
    if (data.length < 1) continue;

    const field = ID3_FIELDS[id];
    if (field) {
      if (!tags[field]) tags[field] = cleanText(decodeText(data, data[0], 1));
    } else if ((id === 'APIC' || id === 'PIC') && options.withArtwork && !tags.artwork) {
      const encoding = data[0];
      let p = 1;
      let mime;
      if (id === 'APIC') {
        const [mimeEnd, next] = findTerminator(data, p, 0);
        mime = decodeLatin1(data, p, mimeEnd);
        p = next;
      } else {
        mime = ascii(data, p, 3).toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
        p += 3;
      }
      p += 1; // picture type
      const [, afterDesc] = findTerminator(data, p, encoding);
      const image = data.subarray(afterDesc);
      if (image.length > 64) {
        tags.artwork = { bytes: image, mime: mimeFromBytes(image, mime || 'image/jpeg') };
      }
    } else if (id === 'USLT' || id === 'ULT') {
      const encoding = data[0];
      const [, afterDesc] = findTerminator(data, 4, encoding);
      const text = decodeText(data, encoding, afterDesc).replace(/\u0000/g, '').trim();
      if (text) {
        tags.hasLyrics = true;
        if (options.withLyrics) tags.lyrics = text;
      }
    }
  }

  return { tags, tagEnd: totalSize };
}

// MPEG audio bitrate tables (kbps) for Layer III.
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

/** Bitrate of the first MP3 frame in kbps, or null if VBR/unknown. */
function readMp3Bitrate(reader, start) {
  const chunk = reader.read(start, 4096);
  for (let i = 0; i + 4 < chunk.length; i++) {
    if (chunk[i] !== 0xff || (chunk[i + 1] & 0xe0) !== 0xe0) continue;
    const versionBits = (chunk[i + 1] >> 3) & 0x03;
    const layerBits = (chunk[i + 1] >> 1) & 0x03;
    const bitrateIndex = chunk[i + 2] >> 4;
    if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15) continue;
    // A Xing/Info header means VBR: the caller should use the average instead.
    const frame = ascii(chunk, i, Math.min(200, chunk.length - i));
    if (frame.includes('Xing') || frame.includes('VBRI')) return null;
    const table = versionBits === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3;
    return table[bitrateIndex] || null;
  }
  return null;
}

// ── MP4 / M4A ─────────────────────────────────────────────────

const MP4_FIELDS = {
  '©nam': 'title',
  '©ART': 'artist',
  aART: 'albumArtist',
  '©alb': 'album',
  '©day': 'year',
  '©gen': 'genre',
};

function* boxes(bytes, start, end) {
  let pos = start;
  while (pos + 8 <= end) {
    let size = be32(bytes, pos);
    const type = ascii(bytes, pos + 4, 4);
    let headerSize = 8;
    if (size === 1) {
      size = be32(bytes, pos + 12); // 64-bit size: low word is enough for metadata boxes
      headerSize = 16;
    } else if (size === 0) {
      size = end - pos;
    }
    if (size < headerSize || pos + size > end) return;
    yield { type, start: pos + headerSize, end: pos + size };
    pos += size;
  }
}

function findBox(bytes, start, end, type) {
  for (const box of boxes(bytes, start, end)) {
    if (box.type === type) return box;
  }
  return null;
}

function readMp4(reader, options) {
  // Locate the top-level 'moov' box without reading the media data.
  let pos = 0;
  let moov = null;
  while (pos + 8 <= reader.size) {
    const head = reader.read(pos, 16);
    if (head.length < 8) break;
    let size = be32(head, 0);
    const type = ascii(head, 4, 4);
    if (pos === 0 && type !== 'ftyp') return null;
    if (size === 1) size = be32(head, 8) * 4294967296 + be32(head, 12);
    else if (size === 0) size = reader.size - pos;
    if (size < 8) break;
    if (type === 'moov') {
      if (size > MAX_TAG_BYTES) return { tags: {} };
      moov = reader.read(pos, size);
      break;
    }
    pos += size;
  }
  if (!moov) return { tags: {} };

  const udta = findBox(moov, 8, moov.length, 'udta');
  const meta = udta && findBox(moov, udta.start, udta.end, 'meta');
  // 'meta' is a full box: 4 bytes of version/flags precede its children.
  const ilst = meta && findBox(moov, meta.start + 4, meta.end, 'ilst');
  if (!ilst) return { tags: {} };

  const tags = {};
  for (const item of boxes(moov, ilst.start, ilst.end)) {
    const data = findBox(moov, item.start, item.end, 'data');
    if (!data) continue;
    const payloadStart = data.start + 8; // type indicator + locale
    const payload = moov.subarray(payloadStart, data.end);

    const field = MP4_FIELDS[item.type];
    if (field) {
      tags[field] = cleanText(decodeUtf8(payload));
    } else if (item.type === 'trkn' && payload.length >= 4) {
      tags.track = String((payload[2] << 8) | payload[3]);
    } else if (item.type === 'covr' && options.withArtwork && !tags.artwork && payload.length > 64) {
      tags.artwork = { bytes: payload, mime: mimeFromBytes(payload) };
    } else if (item.type === '©lyr') {
      const text = decodeUtf8(payload).trim();
      if (text) {
        tags.hasLyrics = true;
        if (options.withLyrics) tags.lyrics = text;
      }
    }
  }
  return { tags };
}

// ── FLAC ──────────────────────────────────────────────────────

const VORBIS_FIELDS = {
  TITLE: 'title',
  ARTIST: 'artist',
  ALBUMARTIST: 'albumArtist',
  'ALBUM ARTIST': 'albumArtist',
  ALBUM: 'album',
  TRACKNUMBER: 'track',
  DATE: 'year',
  YEAR: 'year',
  GENRE: 'genre',
};

function readFlac(reader, options) {
  if (ascii(reader.read(0, 4), 0, 4) !== 'fLaC') return null;
  const tags = {};
  let pos = 4;
  for (let guard = 0; guard < 64 && pos + 4 <= reader.size; guard++) {
    const head = reader.read(pos, 4);
    const isLast = head[0] & 0x80;
    const type = head[0] & 0x7f;
    const length = (head[1] << 16) | (head[2] << 8) | head[3];
    const start = pos + 4;
    pos = start + length;

    if (type === 4 && length <= MAX_TAG_BYTES) {
      const block = reader.read(start, length);
      let p = 4 + le32(block, 0); // skip vendor string
      const count = le32(block, p);
      p += 4;
      for (let i = 0; i < count && p + 4 <= block.length; i++) {
        const len = le32(block, p);
        p += 4;
        const entry = decodeUtf8(block, p, p + len);
        p += len;
        const eq = entry.indexOf('=');
        if (eq < 0) continue;
        const key = entry.slice(0, eq).toUpperCase();
        const value = entry.slice(eq + 1).trim();
        const field = VORBIS_FIELDS[key];
        if (field && !tags[field]) tags[field] = value;
        if ((key === 'LYRICS' || key === 'UNSYNCEDLYRICS') && value) {
          tags.hasLyrics = true;
          if (options.withLyrics) tags.lyrics = value;
        }
      }
    } else if (type === 6 && options.withArtwork && !tags.artwork && length <= MAX_TAG_BYTES) {
      const block = reader.read(start, length);
      let p = 4;
      const mimeLength = be32(block, p);
      const mime = ascii(block, p + 4, mimeLength);
      p += 4 + mimeLength;
      p += 4 + be32(block, p); // description
      p += 16; // width, height, depth, colors
      const dataLength = be32(block, p);
      p += 4;
      const image = block.subarray(p, p + dataLength);
      if (image.length > 64) tags.artwork = { bytes: image, mime: mimeFromBytes(image, mime) };
    }
    if (isLast) break;
  }
  return { tags };
}

// ── Public API ────────────────────────────────────────────────

export function getExtension(filename = '') {
  const match = filename.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Best-effort title/artist from a file name such as
 * "01 - Artist - Song.mp3" or "Song (Official Audio).m4a".
 */
export function parseFilename(filename = '') {
  let name = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').trim();
  name = name.replace(/^\d{1,3}\s*[-.)]\s*/, ''); // leading track number
  const parts = name.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: '', title: name || 'Unknown Song' };
}

/**
 * Read tags from a local file.
 * @param {string} uri file:// URI
 * @param {{ withArtwork?: boolean, withLyrics?: boolean }} options
 * @returns {object|null} normalized tags or null when unreadable
 */
export function readMetadata(uri, options = {}) {
  let reader;
  try {
    reader = openReader(uri);
    const ext = getExtension(uri);
    let result = null;

    if (ext === 'flac') result = readFlac(reader, options);
    else if (ext === 'm4a' || ext === 'mp4' || ext === 'aac' || ext === 'alac') result = readMp4(reader, options);
    if (!result) result = readId3(reader, options);

    const tags = result?.tags || {};
    return {
      title: tags.title || '',
      artist: tags.artist || '',
      albumArtist: tags.albumArtist || '',
      album: tags.album || '',
      trackNumber: parseTrackNumber(tags.track),
      year: parseYear(tags.year),
      genre: /^\(?\d+\)?$/.test(tags.genre || '') ? '' : tags.genre || '',
      hasLyrics: !!tags.hasLyrics,
      lyrics: tags.lyrics || null,
      artwork: tags.artwork || null,
      size: reader.size,
      tagEnd: result?.tagEnd || 0,
    };
  } catch (error) {
    return null;
  } finally {
    reader?.close();
  }
}

/**
 * Technical details for the Song Information sheet (read on demand).
 */
export function readTechnicalInfo(uri, durationSeconds) {
  let reader;
  try {
    reader = openReader(uri);
    const ext = getExtension(uri);
    let bitrate = null;
    let isAverage = false;

    if (ext === 'mp3') {
      const id3 = readId3(reader, {});
      bitrate = readMp3Bitrate(reader, id3?.tagEnd || 0);
    }
    if (!bitrate && durationSeconds > 0 && reader.size > 0) {
      bitrate = Math.round((reader.size * 8) / durationSeconds / 1000);
      isAverage = true;
    }
    return { size: reader.size, bitrate, isAverage };
  } catch (error) {
    return null;
  } finally {
    reader?.close();
  }
}
