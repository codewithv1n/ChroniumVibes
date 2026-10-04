/**
 * VinVibes — User data (favorites, listening stats, searches,
 * settings, playlists). Everything is stored locally on the device.
 */

import { createStore } from '../core/store';
import { KEYS, readJSON, writeJSON, createDebouncedWriter } from '../core/storage';
import * as playlistStorage from '../player/playlistStorage';

export const DEFAULT_SETTINGS = {
  animations: true,
  resumePlayback: true,
  rememberQueue: true,
  autoPlayNext: true,
  excludedFolders: [],
  // Hides ringtones, notification sounds and short voice notes.
  minDurationSeconds: 30,
  songSort: { key: 'title', ascending: true },
};

export const settingsStore = createStore({ ...DEFAULT_SETTINGS });
export const favoritesStore = createStore({ favorites: {} }); // id -> likedAt
export const statsStore = createStore({ stats: {} }); // id -> { plays, lastPlayed, listened }
export const searchHistoryStore = createStore({ recent: [] });
export const playlistsStore = createStore({ playlists: [] });

const statsWriter = createDebouncedWriter(KEYS.stats, 3000);
const MAX_RECENT_SEARCHES = 12;

export async function initUserData() {
  const [settings, favorites, stats, recent, playlists] = await Promise.all([
    readJSON(KEYS.settings, {}),
    readJSON(KEYS.favorites, {}),
    readJSON(KEYS.stats, {}),
    readJSON(KEYS.recentSearches, []),
    playlistStorage.loadPlaylists(),
  ]);
  settingsStore.setState({ ...DEFAULT_SETTINGS, ...settings });
  favoritesStore.setState({ favorites: favorites || {} });
  statsStore.setState({ stats: stats || {} });
  searchHistoryStore.setState({ recent: Array.isArray(recent) ? recent : [] });
  playlistsStore.setState({ playlists });
}

export function flushUserData() {
  commitListeningTime();
  return statsWriter.flush();
}

// ── Settings ──────────────────────────────────────────────────

export function updateSettings(partial) {
  settingsStore.setState(partial);
  writeJSON(KEYS.settings, settingsStore.getState());
}

export function toggleFolderExcluded(folderPath) {
  const current = new Set(settingsStore.getState().excludedFolders);
  if (current.has(folderPath)) current.delete(folderPath);
  else current.add(folderPath);
  updateSettings({ excludedFolders: [...current] });
}

// ── Favorites ─────────────────────────────────────────────────

export function isFavorite(trackId) {
  return !!favoritesStore.getState().favorites[trackId];
}

/** @returns {boolean} the new favorite state */
export function toggleFavorite(trackId) {
  const favorites = { ...favoritesStore.getState().favorites };
  const nowFavorite = !favorites[trackId];
  if (nowFavorite) favorites[trackId] = Date.now();
  else delete favorites[trackId];
  favoritesStore.setState({ favorites });
  writeJSON(KEYS.favorites, favorites);
  return nowFavorite;
}

/** Favorite ids, most recently liked first. */
export function getFavoriteIds(favorites = favoritesStore.getState().favorites) {
  return Object.keys(favorites).sort((a, b) => favorites[b] - favorites[a]);
}

// ── Listening history ─────────────────────────────────────────

function updateStat(trackId, update) {
  const stats = statsStore.getState().stats;
  const current = stats[trackId] || { plays: 0, lastPlayed: 0, listened: 0 };
  const next = { ...stats, [trackId]: { ...current, ...update(current) } };
  statsStore.setState({ stats: next });
  statsWriter.write(next);
}

export function recordPlayStarted(trackId) {
  updateStat(trackId, () => ({ lastPlayed: Date.now() }));
}

/** Counted once the listener has heard 30s (or half of a short track). */
export function recordPlayCounted(trackId) {
  updateStat(trackId, s => ({ plays: s.plays + 1 }));
}

// Listening time arrives twice a second; buffer it so screens that
// depend on stats don't recompute constantly.
const pendingListening = new Map();
let listeningTimer = null;

function commitListeningTime() {
  if (listeningTimer) clearTimeout(listeningTimer);
  listeningTimer = null;
  if (pendingListening.size === 0) return;
  const stats = { ...statsStore.getState().stats };
  for (const [id, seconds] of pendingListening) {
    const current = stats[id] || { plays: 0, lastPlayed: 0, listened: 0 };
    stats[id] = { ...current, listened: Math.round((current.listened + seconds) * 10) / 10 };
  }
  pendingListening.clear();
  statsStore.setState({ stats });
  statsWriter.write(stats);
}

export function addListeningTime(trackId, seconds) {
  if (!(seconds > 0)) return;
  pendingListening.set(trackId, (pendingListening.get(trackId) || 0) + seconds);
  if (!listeningTimer) listeningTimer = setTimeout(commitListeningTime, 30000);
}

// ── Recent searches ───────────────────────────────────────────

export function addRecentSearch(query) {
  const q = query.trim();
  if (q.length < 2) return;
  const recent = [q, ...searchHistoryStore.getState().recent.filter(r => r.toLowerCase() !== q.toLowerCase())]
    .slice(0, MAX_RECENT_SEARCHES);
  searchHistoryStore.setState({ recent });
  writeJSON(KEYS.recentSearches, recent);
}

export function removeRecentSearch(query) {
  const recent = searchHistoryStore.getState().recent.filter(r => r !== query);
  searchHistoryStore.setState({ recent });
  writeJSON(KEYS.recentSearches, recent);
}

export function clearRecentSearches() {
  searchHistoryStore.setState({ recent: [] });
  writeJSON(KEYS.recentSearches, []);
}

// ── Playlists ─────────────────────────────────────────────────
// Thin wrappers that keep the shared playlists store in sync after
// every write, so all screens show the same data.

export async function refreshPlaylists() {
  playlistsStore.setState({ playlists: await playlistStorage.loadPlaylists() });
}

function withRefresh(fn) {
  return async (...args) => {
    const result = await fn(...args);
    await refreshPlaylists();
    return result;
  };
}

export const createPlaylist = withRefresh(playlistStorage.createPlaylist);
export const renamePlaylist = withRefresh(playlistStorage.renamePlaylist);
export const deletePlaylist = withRefresh(playlistStorage.deletePlaylist);
export const addTrackToPlaylist = withRefresh(playlistStorage.addTrackToPlaylist);
export const addTracksToPlaylist = withRefresh(playlistStorage.addTracksToPlaylist);
export const removeTrackFromPlaylist = withRefresh(playlistStorage.removeTrackFromPlaylist);
export const setTrackPlaylists = withRefresh(playlistStorage.setTrackPlaylists);
export const moveTrackInPlaylist = withRefresh(playlistStorage.moveTrackInPlaylist);

export function getPlaylist(playlistId) {
  return playlistsStore.getState().playlists.find(p => p.id === playlistId) || null;
}
