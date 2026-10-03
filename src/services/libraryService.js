/**
 * VinVibes — Local music library
 *
 * Scan flow:
 *  1. Load the cached index from disk -> UI is usable immediately.
 *  2. Query MediaStore (cheap) for the current list of audio assets.
 *  3. Diff against the cache: only NEW or MODIFIED files get their tags
 *     read; deleted files are dropped. Work is chunked so the UI stays
 *     responsive, and progress is published to the store.
 *  4. Derive albums, artists and folders; apply folder exclusions,
 *     the minimum-duration filter and duplicate removal.
 *
 * Uses `expo-media-library/legacy`: in SDK 57 the old functions on the
 * main `expo-media-library` export throw at runtime.
 */

import { Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { File } from 'expo-file-system';
import { createStore } from '../core/store';
import { readJSONFile, writeJSONFile, getArtworkDirectory, clearArtworkDirectory } from '../core/storage';
import { normalizeText } from '../core/format';
import { readMetadata, parseFilename, getExtension } from './metadataReader';
import { settingsStore } from './userDataService';

const CACHE_FILE = 'library-index.json';
const CACHE_VERSION = 2;
const PAGE_SIZE = 500;
const TAG_BATCH = 12;

export const UNKNOWN_ARTIST = 'Unknown Artist';
export const UNKNOWN_ALBUM = 'Unknown Album';

// Formats Android's media player (ExoPlayer) can decode.
export const SUPPORTED_EXTENSIONS = ['mp3', 'm4a', 'aac', 'mp4', 'wav', 'flac', 'ogg', 'oga', 'opus', 'amr', '3gp', 'mid', 'midi', 'wma'];

export const libraryStore = createStore({
  status: 'idle', // idle | loading | scanning | ready | error
  permission: 'unknown', // unknown | granted | denied | blocked
  progress: null, // { done, total } while reading tags
  allTracks: [], // every indexed track (before exclusions)
  tracks: [], // visible library
  byId: new Map(),
  albums: [],
  artists: [],
  folders: [], // all folders, including excluded ones
  duplicatesHidden: 0,
  lastScan: 0,
  error: null,
});

let scanPromise = null;

// ── Permissions ───────────────────────────────────────────────

function toPermissionState(response) {
  if (response?.granted || response?.status === 'granted') return 'granted';
  if (response && response.canAskAgain === false) return 'blocked';
  return 'denied';
}

export async function checkPermission() {
  try {
    const response = await MediaLibrary.getPermissionsAsync(false, ['audio']);
    const permission = toPermissionState(response);
    libraryStore.setState({ permission });
    return permission;
  } catch (error) {
    console.error('Permission check failed:', error);
    libraryStore.setState({ permission: 'denied' });
    return 'denied';
  }
}

export async function requestPermission() {
  try {
    const response = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    const permission = toPermissionState(response);
    libraryStore.setState({ permission });
    return permission;
  } catch (error) {
    console.error('Permission request failed:', error);
    libraryStore.setState({ permission: 'denied' });
    return 'denied';
  }
}

export function openAppSettings() {
  Linking.openSettings().catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────

const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

export function folderOf(uri = '') {
  const path = decodeURIComponent(uri.replace(/^file:\/\//, ''));
  const index = path.lastIndexOf('/');
  return index > 0 ? path.slice(0, index) : '/';
}

export function folderName(folderPath = '') {
  const parts = folderPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'Storage';
}

/** "/storage/emulated/0/Music/Pop" -> "Internal storage/Music/Pop" */
export function prettyFolderPath(folderPath = '') {
  return folderPath
    .replace(/^\/storage\/emulated\/0/, 'Internal storage')
    .replace(/^\/storage\/([^/]+)/, 'SD card ($1)');
}

function albumKey(album, artist) {
  return `${normalizeText(artist)}|${normalizeText(album)}`;
}

/** Id of the album / artist collection a track belongs to. */
export const albumIdFor = track => albumKey(track.album, track.albumArtist);
export const artistIdFor = track => normalizeText(track.artist);

function hashString(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

/**
 * Write embedded artwork once per album (not once per song) into the
 * app cache and return its file URI.
 */
function saveArtwork(key, artwork, writtenThisScan) {
  if (!artwork?.bytes?.length) return null;
  const ext = artwork.mime === 'image/png' ? 'png' : 'jpg';
  const name = `${hashString(key)}.${ext}`;
  const file = new File(getArtworkDirectory(), name);
  try {
    if (!writtenThisScan.has(name) && !file.exists) {
      file.create();
      // Copy: `bytes` is a view into the larger tag buffer.
      file.write(artwork.bytes.slice());
    }
    writtenThisScan.add(name);
    return file.uri;
  } catch (error) {
    console.log('Could not save artwork:', error?.message);
    return null;
  }
}

/** Build a track record from a MediaStore asset + its tags. */
function buildTrack(asset, tags, artworkCache) {
  const fromName = parseFilename(asset.filename);
  const title = tags?.title || fromName.title;
  const artist = tags?.artist || fromName.artist || UNKNOWN_ARTIST;
  const albumArtist = tags?.albumArtist || artist;
  const album = tags?.album || '';

  let artwork = null;
  if (tags?.artwork) {
    const key = album ? albumKey(album, albumArtist) : `track:${asset.id}`;
    artwork = saveArtwork(key, tags.artwork, artworkCache);
  }

  return {
    id: String(asset.id),
    url: asset.uri,
    filename: asset.filename,
    title,
    artist,
    albumArtist,
    album: album || UNKNOWN_ALBUM,
    trackNumber: tags?.trackNumber || 0,
    year: tags?.year || 0,
    genre: tags?.genre || '',
    duration: Math.round(asset.duration || 0),
    size: tags?.size || 0,
    format: getExtension(asset.filename).toUpperCase(),
    folder: folderOf(asset.uri),
    dateAdded: asset.creationTime || asset.modificationTime || 0,
    modified: asset.modificationTime || 0,
    artwork,
    hasLyrics: !!tags?.hasLyrics,
  };
}

/**
 * Same physical file reported twice, or byte-identical copies of a song
 * in different folders (e.g. Download + Telegram). Never by title alone.
 */
function removeDuplicates(tracks) {
  const seenUris = new Set();
  const seenCopies = new Set();
  const result = [];
  let hidden = 0;
  for (const track of tracks) {
    if (seenUris.has(track.url)) { hidden++; continue; }
    seenUris.add(track.url);
    const copyKey = track.size > 0
      ? `${track.filename.toLowerCase()}|${track.size}|${Math.round(track.duration)}`
      : null;
    if (copyKey && seenCopies.has(copyKey)) { hidden++; continue; }
    if (copyKey) seenCopies.add(copyKey);
    result.push(track);
  }
  return { tracks: result, hidden };
}

function buildCollections(tracks) {
  const albumMap = new Map();
  const artistMap = new Map();

  for (const track of tracks) {
    const aKey = albumKey(track.album, track.albumArtist);
    let album = albumMap.get(aKey);
    if (!album) {
      album = {
        id: aKey,
        name: track.album,
        artist: track.albumArtist,
        artwork: null,
        year: 0,
        trackIds: [],
        duration: 0,
      };
      albumMap.set(aKey, album);
    }
    album.trackIds.push(track.id);
    album.duration += track.duration;
    if (!album.artwork && track.artwork) album.artwork = track.artwork;
    if (!album.year && track.year) album.year = track.year;

    const rKey = normalizeText(track.artist);
    let artist = artistMap.get(rKey);
    if (!artist) {
      artist = { id: rKey, name: track.artist, artwork: null, trackIds: [], albumIds: new Set(), duration: 0 };
      artistMap.set(rKey, artist);
    }
    artist.trackIds.push(track.id);
    artist.albumIds.add(aKey);
    artist.duration += track.duration;
    if (!artist.artwork && track.artwork) artist.artwork = track.artwork;
  }

  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  const albums = [...albumMap.values()].sort(byName);
  const artists = [...artistMap.values()]
    .map(a => ({ ...a, albumIds: [...a.albumIds] }))
    .sort(byName);
  return { albums, artists };
}

function buildFolders(allTracks, excluded) {
  const map = new Map();
  for (const track of allTracks) {
    let folder = map.get(track.folder);
    if (!folder) {
      folder = { id: track.folder, path: track.folder, name: folderName(track.folder), trackIds: [], excluded: excluded.has(track.folder) };
      map.set(track.folder, folder);
    }
    folder.trackIds.push(track.id);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Recompute the visible library from the full index using the current
 * settings (folder exclusions, minimum duration). No disk access.
 */
export function applyLibraryFilters(allTracks = libraryStore.getState().allTracks) {
  const settings = settingsStore.getState();
  const excluded = new Set(settings.excludedFolders || []);
  const minDuration = settings.minDurationSeconds || 0;

  const visible = allTracks.filter(
    t => !excluded.has(t.folder) && (t.duration === 0 || t.duration >= minDuration)
  );
  const { tracks, hidden } = removeDuplicates(visible);
  const { albums, artists } = buildCollections(tracks);

  libraryStore.setState({
    allTracks,
    tracks,
    byId: new Map(tracks.map(t => [t.id, t])),
    albums,
    artists,
    folders: buildFolders(allTracks, excluded),
    duplicatesHidden: hidden,
  });
}

// ── Scanning ──────────────────────────────────────────────────

async function listAudioAssets() {
  const assets = [];
  let after;
  for (;;) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: PAGE_SIZE,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    assets.push(...page.assets);
    if (!page.hasNextPage || page.assets.length === 0) break;
    after = page.endCursor;
  }
  return assets;
}

/** Load the cached index (instant, no permission prompt). */
export function loadCachedLibrary() {
  const cache = readJSONFile(CACHE_FILE, null);
  if (cache?.version === CACHE_VERSION && Array.isArray(cache.tracks)) {
    applyLibraryFilters(cache.tracks);
    libraryStore.setState({ status: 'ready', lastScan: cache.scannedAt || 0 });
    return cache.tracks.length;
  }
  return 0;
}

/**
 * Incremental scan. Pass { full: true } to re-read every file's tags
 * (Settings > Rescan all metadata).
 * @returns {Promise<{ total: number, added: number, removed: number } | null>}
 */
export function scanLibrary({ full = false } = {}) {
  if (scanPromise) return scanPromise;
  scanPromise = runScan(full).finally(() => {
    scanPromise = null;
  });
  return scanPromise;
}

async function runScan(full) {
  const permission = await checkPermission();
  if (permission !== 'granted') {
    const requested = permission === 'blocked' ? permission : await requestPermission();
    if (requested !== 'granted') {
      libraryStore.setState({ status: libraryStore.getState().allTracks.length ? 'ready' : 'idle' });
      return null;
    }
  }

  const hadTracks = libraryStore.getState().allTracks.length > 0;
  libraryStore.setState({ status: hadTracks ? 'scanning' : 'loading', error: null, progress: null });

  try {
    if (full) clearArtworkDirectory();
    const assets = (await listAudioAssets()).filter(a =>
      SUPPORTED_EXTENSIONS.includes(getExtension(a.filename))
    );

    const cached = full ? new Map() : new Map(libraryStore.getState().allTracks.map(t => [t.id, t]));
    const toRead = [];
    const next = [];
    for (const asset of assets) {
      const previous = cached.get(String(asset.id));
      if (previous && previous.url === asset.uri && previous.modified === (asset.modificationTime || 0)) {
        next.push(previous);
      } else {
        toRead.push(asset);
        next.push(null); // placeholder keeps MediaStore order
      }
    }

    const added = toRead.length;
    const removed = Math.max(0, cached.size - (assets.length - added));
    const artworkCache = new Set();
    const readResults = new Map();

    for (let i = 0; i < toRead.length; i++) {
      const asset = toRead[i];
      const tags = readMetadata(asset.uri, { withArtwork: true });
      readResults.set(asset.id, buildTrack(asset, tags, artworkCache));
      if (i % TAG_BATCH === TAG_BATCH - 1) {
        libraryStore.setState({ progress: { done: i + 1, total: toRead.length } });
        await yieldToUI();
      }
    }

    let readIndex = 0;
    const allTracks = next.map(track => track || readResults.get(toRead[readIndex++].id));

    writeJSONFile(CACHE_FILE, { version: CACHE_VERSION, scannedAt: Date.now(), tracks: allTracks });
    applyLibraryFilters(allTracks);
    libraryStore.setState({ status: 'ready', progress: null, lastScan: Date.now() });

    return { total: libraryStore.getState().tracks.length, added: hadTracks ? added : 0, removed };
  } catch (error) {
    console.error('Library scan failed:', error);
    libraryStore.setState({
      status: hadTracks ? 'ready' : 'error',
      progress: null,
      error: error?.message || 'Scan failed',
    });
    return null;
  }
}

/** Read lyrics on demand (not stored in the index to keep it small). */
export function loadLyrics(track) {
  if (!track?.hasLyrics) return null;
  return readMetadata(track.url, { withLyrics: true })?.lyrics || null;
}

/** Check that a track's file still exists before playing it. */
export function trackFileExists(track) {
  try {
    return new File(track.url).exists;
  } catch (error) {
    return false;
  }
}

export function getTrack(id) {
  return libraryStore.getState().byId.get(id) || null;
}

export function getTracks(ids) {
  const { byId } = libraryStore.getState();
  const out = [];
  for (const id of ids) {
    const track = byId.get(id);
    if (track) out.push(track);
  }
  return out;
}
