/**
 * ChroniumVibes — Playlist Storage (AsyncStorage)
 * 
 * CRUD operations for user-created playlists.
 * Playlists are persisted locally on the device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@chroniumvibes_playlists';

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
export async function createPlaylist(name) {
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
}

/**
 * Add a track to a playlist (prevents duplicates)
 * @param {string} playlistId 
 * @param {Object} track - Track object { id, title, artist, url, duration }
 * @returns {Promise<boolean>} true if added, false if duplicate
 */
export async function addTrackToPlaylist(playlistId, track) {
  const playlists = await loadPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) return false;

  // Check for duplicates
  const exists = playlist.tracks.some(t => t.id === track.id);
  if (exists) return false;

  playlist.tracks.push({
    id: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    duration: track.duration,
  });

  await savePlaylists(playlists);
  return true;
}

/**
 * Remove a track from a playlist
 * @param {string} playlistId 
 * @param {string} trackId 
 */
export async function removeTrackFromPlaylist(playlistId, trackId) {
  const playlists = await loadPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) return;

  playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
  await savePlaylists(playlists);
}

/**
 * Delete an entire playlist
 * @param {string} playlistId 
 */
export async function deletePlaylist(playlistId) {
  const playlists = await loadPlaylists();
  const filtered = playlists.filter(p => p.id !== playlistId);
  await savePlaylists(filtered);
}

/**
 * Rename a playlist
 * @param {string} playlistId 
 * @param {string} newName 
 */
export async function renamePlaylist(playlistId, newName) {
  const playlists = await loadPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  if (playlist) {
    playlist.name = newName.trim();
    await savePlaylists(playlists);
  }
}
