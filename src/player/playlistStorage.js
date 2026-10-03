/**
 * VinVibes — Playlist Storage (AsyncStorage)
 * 
 * CRUD operations for user-created playlists.
 * Playlists are persisted locally on the device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../core/storage';

const STORAGE_KEY = KEYS.playlists;

// Serialize read-modify-write operations so fast taps can't overwrite each other.
let writeQueue = Promise.resolve();
function withWriteLock(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

/**
 * Keep only the fields a playlist needs to store for a track
 */
function toPlaylistTrack(track) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    duration: track.duration,
  };
}

/**
 * Generate a simple unique ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Load all playlists from storage
 * @returns {Promise<Array>} Array of playlist objects
 */
export async function loadPlaylists() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return [];
  } catch (error) {
    console.error('Error loading playlists:', error);
    return [];
  }
}

/**
 * Save all playlists to storage
 * @param {Array} playlists - Full array of playlists
 */
export async function savePlaylists(playlists) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (error) {
    console.error('Error saving playlists:', error);
  }
}

/**
 * Create a new empty playlist
 * @param {string} name - Playlist name
 * @returns {Promise<Object>} The created playlist
 */
export function createPlaylist(name) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const newPlaylist = {
      id: generateId(),
      name: name.trim(),
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    await savePlaylists(playlists);
    return newPlaylist;
  });
}

/**
 * Add a track to a playlist (prevents duplicates)
 * @param {string} playlistId 
 * @param {Object} track - Track object { id, title, artist, url, duration }
 * @returns {Promise<boolean>} true if added, false if duplicate
 */
export async function addTrackToPlaylist(playlistId, track) {
  const added = await addTracksToPlaylist(playlistId, [track]);
  return added > 0;
}

/**
 * Add several tracks to a playlist, skipping ones already in it
 * @param {string} playlistId
 * @param {Array} tracks
 * @returns {Promise<number>} How many tracks were added
 */
export function addTracksToPlaylist(playlistId, tracks) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return 0;

    const existing = new Set(playlist.tracks.map(t => t.id));
    let added = 0;
    for (const track of tracks) {
      if (existing.has(track.id)) continue;
      existing.add(track.id);
      playlist.tracks.push(toPlaylistTrack(track));
      added += 1;
    }

    if (added > 0) await savePlaylists(playlists);
    return added;
  });
}

/**
 * Make a track belong to exactly the given playlists (Spotify-style
 * "Save in" sheet): adds it where missing and removes it elsewhere.
 * @param {Object} track
 * @param {Array<string>} playlistIds
 */
export function setTrackPlaylists(track, playlistIds) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const wanted = new Set(playlistIds);

    for (const playlist of playlists) {
      const has = playlist.tracks.some(t => t.id === track.id);
      if (wanted.has(playlist.id) && !has) {
        playlist.tracks.push(toPlaylistTrack(track));
      } else if (!wanted.has(playlist.id) && has) {
        playlist.tracks = playlist.tracks.filter(t => t.id !== track.id);
      }
    }

    await savePlaylists(playlists);
  });
}

/**
 * Remove a track from a playlist
 * @param {string} playlistId 
 * @param {string} trackId 
 */
export function removeTrackFromPlaylist(playlistId, trackId) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
    await savePlaylists(playlists);
  });
}

/**
 * Delete an entire playlist
 * @param {string} playlistId 
 */
export function deletePlaylist(playlistId) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const filtered = playlists.filter(p => p.id !== playlistId);
    await savePlaylists(filtered);
  });
}

/**
 * Move a track inside a playlist (used for reordering)
 * @param {string} playlistId
 * @param {number} fromIndex
 * @param {number} toIndex
 */
export function moveTrackInPlaylist(playlistId, fromIndex, toIndex) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    const { tracks } = playlist;
    if (fromIndex < 0 || fromIndex >= tracks.length || toIndex < 0 || toIndex >= tracks.length) return;
    const [moved] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, moved);
    await savePlaylists(playlists);
  });
}

/**
 * Rename a playlist
 * @param {string} playlistId 
 * @param {string} newName 
 */
export function renamePlaylist(playlistId, newName) {
  return withWriteLock(async () => {
    const playlists = await loadPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.name = newName.trim();
      await savePlaylists(playlists);
    }
  });
}
