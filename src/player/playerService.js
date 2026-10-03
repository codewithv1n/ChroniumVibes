/**
 * VinVibes — Playback engine (expo-audio)
 *
 * One AudioPlayer instance for the whole app, driven by a queue of track
 * ids. All screens, the mini player and the lock screen read the same
 * `playerStore`, so they can never disagree.
 *
 * Background playback notes (Android):
 * - Lock screen controls are activated ONCE; afterwards only the metadata
 *   is updated. Re-activating them per track rebuilds the media session,
 *   which drops the foreground service and lets Android kill playback.
 * - Lock screen / notification Previous & Next come from the patched
 *   expo-audio service (patches/expo-audio+*.patch) as "remoteCommand"
 *   events; the queue lives here in JS, so JS changes the track.
 * - Audio focus (calls, other apps) is handled natively by expo-audio.
 */

import { AppState, Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, requestNotificationPermissionsAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import { createStore } from '../core/store';
import { KEYS, readJSON, createDebouncedWriter } from '../core/storage';
import { showToast } from '../core/toast';
import * as Q from './queue';
import { getTrack, libraryStore, trackFileExists } from '../services/libraryService';
import {
  settingsStore,
  recordPlayStarted,
  recordPlayCounted,
  addListeningTime,
} from '../services/userDataService';

const PLAY_COUNT_SECONDS = 30;

export const playerStore = createStore({
  queue: [], // track ids in play order
  original: null, // un-shuffled order while shuffle is on
  index: 0,
  currentId: null,
  isPlaying: false,
  isBuffering: false,
  shuffle: false,
  repeat: 'off', // off | all | one
});

// Updated every ~500ms; kept separate so only progress UI re-renders.
export const progressStore = createStore({ position: 0, duration: 0 });

let player = null;

// Fast Refresh (development) re-runs this module and would create a second
// native player while the old one keeps playing, unreachable by the app and
// the lock screen. Release any player left by a previous copy of the module.
const PLAYER_GLOBAL_KEY = '__vinvibesAudioPlayer';
if (globalThis[PLAYER_GLOBAL_KEY]) {
  try {
    globalThis[PLAYER_GLOBAL_KEY].pause();
    globalThis[PLAYER_GLOBAL_KEY].remove();
  } catch (error) {
    // Already released.
  }
  globalThis[PLAYER_GLOBAL_KEY] = null;
}
let lockScreenActive = false;
let fallbackArtworkUrl = null;
let loadToken = 0;
let hasAdvancedForToken = -1;
let consecutiveFailures = 0;
let pendingResumePosition = 0;
let playCountedForToken = -1;

const persistWriter = createDebouncedWriter(KEYS.player, 2000);

// ── Setup ─────────────────────────────────────────────────────

export async function initPlayer() {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      // Exclusive audio focus is required for lock screen controls
      // and sustained background playback on Android.
      interruptionMode: 'doNotMix',
    });
  } catch (error) {
    console.error('Failed to set audio mode:', error);
  }

  // Bundled app icon used on the lock screen when a song has no artwork.
  try {
    const [icon] = await Asset.loadAsync(require('../../assets/icon.png'));
    fallbackArtworkUrl = icon.localUri || null;
  } catch (error) {
    fallbackArtworkUrl = null;
  }

  AppState.addEventListener('change', (state) => {
    if (state !== 'active') persistNow();
  });
}

/** Restore the last queue + position (paused) after the library loads. */
export async function restorePlaybackState() {
  const settings = settingsStore.getState();
  if (!settings.rememberQueue) return;
  const saved = await readJSON(KEYS.player, null);
  if (!saved || !Array.isArray(saved.queue) || saved.queue.length === 0) return;

  const exists = id => !!getTrack(id);
  const queue = Q.pruneQueue(
    { order: saved.queue, original: saved.original || null, index: saved.index || 0 },
    exists
  );
  if (queue.order.length === 0) return;

  const id = Q.currentId(queue);
  const track = getTrack(id);
  pendingResumePosition = settings.resumePlayback && saved.currentId === id ? saved.position || 0 : 0;
  playerStore.setState({
    queue: queue.order,
    original: queue.original,
    index: queue.index,
    currentId: id,
    shuffle: !!saved.shuffle,
    repeat: ['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off',
  });
  progressStore.setState({ position: pendingResumePosition, duration: track?.duration || 0 });
}

function getQueue() {
  const { queue, original, index } = playerStore.getState();
  return { order: queue, original, index };
}

function setQueue(queue, extra = {}) {
  playerStore.setState({
    queue: queue.order,
    original: queue.original,
    index: queue.index,
    currentId: Q.currentId(queue),
    ...extra,
  });
  persistSoon();
}

function persistSoon() {
  if (!settingsStore.getState().rememberQueue) return;
  const s = playerStore.getState();
  persistWriter.write({
    queue: s.queue,
    original: s.original,
    index: s.index,
    currentId: s.currentId,
    position: progressStore.getState().position,
    shuffle: s.shuffle,
    repeat: s.repeat,
  });
}

function persistNow() {
  persistSoon();
  persistWriter.flush();
}

function ensurePlayer() {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 500 });
    player.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
    player.addListener('remoteCommand', ({ command } = {}) => {
      if (command === 'next') skipToNext();
      else if (command === 'previous') skipToPrevious();
    });
    globalThis[PLAYER_GLOBAL_KEY] = player;
  }
  return player;
}

function lockScreenMetadata(track) {
  return {
    title: track.title,
    artist: track.artist,
    albumTitle: track.album,
    artworkUrl: track.artwork || fallbackArtworkUrl || undefined,
  };
}

/**
 * Android 13+: ask once for notification permission. Media controls are
 * normally exempt, but some manufacturers hide the playback notification
 * (and its lock screen controller) without it.
 */
let notificationPermissionAsked = false;
function ensureNotificationPermission() {
  if (notificationPermissionAsked || Platform.OS !== 'android') return;
  notificationPermissionAsked = true;
  requestNotificationPermissionsAsync().catch(() => {});
}

function applyLockScreenControls(track) {
  if (!player || !track) return;
  const metadata = lockScreenMetadata(track);
  if (lockScreenActive) {
    player.updateLockScreenMetadata(metadata);
    return;
  }
  player.setActiveForLockScreen(true, metadata, {
    showSeekForward: true,
    showSeekBackward: true,
  });
  lockScreenActive = true;
}

// ── Loading tracks ────────────────────────────────────────────

/**
 * Load and play the track at `index` of the current queue. Missing or
 * removed files are skipped with a message instead of stopping playback.
 */
async function loadIndex(index, { autoplay = true, startAt = 0 } = {}) {
  const queue = getQueue();
  if (queue.order.length === 0) return;
  const safeIndex = Math.min(Math.max(index, 0), queue.order.length - 1);
  const id = queue.order[safeIndex];
  const track = getTrack(id);
  const token = ++loadToken;

  setQueue({ ...queue, index: safeIndex });

  if (!track) {
    consecutiveFailures += 1;
    showToast('This song is no longer available on your device.', { icon: 'alert-circle' });
    if (consecutiveFailures < queue.order.length) {
      const next = Q.nextIndex({ ...queue, index: safeIndex }, 'all');
      if (next !== null && next !== safeIndex) loadIndex(next, { autoplay });
    }
    return;
  }

  try {
    const audioPlayer = ensurePlayer();
    if (token !== loadToken) return;
    pendingResumePosition = 0;

    audioPlayer.replace({ uri: track.url });
    audioPlayer.loop = playerStore.getState().repeat === 'one';
    applyLockScreenControls(track);
    progressStore.setState({ position: startAt, duration: track.duration || 0 });
    if (startAt > 0) await audioPlayer.seekTo(startAt);
    // A newer request (e.g. rapid Next taps) superseded this one.
    if (token !== loadToken) return;
    if (autoplay) {
      ensureNotificationPermission();
      audioPlayer.play();
      recordPlayStarted(track.id);
    }
    persistSoon();
  } catch (error) {
    console.error(`Error loading "${track.title}":`, error);
  }
}

// ── Public controls ───────────────────────────────────────────

/** Replace the queue and start playing. */
export function playTracks(ids, startIndex = 0, { shuffle = false } = {}) {
  if (!ids || ids.length === 0) return;
  consecutiveFailures = 0;
  const queue = Q.createQueue(ids, startIndex, shuffle);
  setQueue(queue, { shuffle });
  loadIndex(queue.index);
}

/** Context menu "Play now": play this song, keep the rest of the queue. */
export function playNow(id) {
  const queue = getQueue();
  if (queue.order.length === 0) {
    playTracks([id]);
    return;
  }
  const next = Q.playNext(queue, id);
  setQueue(next);
  loadIndex(next.index + 1);
}

export function playNext(id) {
  const queue = getQueue();
  if (queue.order.length === 0) {
    playTracks([id]);
    return;
  }
  setQueue(Q.playNext(queue, id));
  showToast('Playing next');
}

export function addToQueue(ids) {
  const queue = getQueue();
  if (queue.order.length === 0) {
    playTracks(Array.isArray(ids) ? ids : [ids]);
    return;
  }
  setQueue(Q.addToQueue(queue, ids));
  showToast('Added to queue');
}

export function togglePlayPause() {
  const { currentId } = playerStore.getState();
  if (!currentId) return;
  // Nothing loaded yet (e.g. restored queue after app restart).
  if (!player || !player.isLoaded) {
    loadIndex(playerStore.getState().index, { startAt: pendingResumePosition });
    return;
  }
  if (player.playing) {
    player.pause();
    persistNow();
  } else {
    player.play();
  }
}

export function skipToNext() {
  consecutiveFailures = 0;
  const next = Q.nextIndex(getQueue(), 'all');
  if (next !== null) loadIndex(next);
}

/** Restarts the song if more than 3s in (like most players). */
export function skipToPrevious() {
  consecutiveFailures = 0;
  if (player && player.currentTime > 3) {
    seekTo(0);
    return;
  }
  const prev = Q.previousIndex(getQueue(), 'all');
  if (prev !== null) loadIndex(prev);
}

export async function seekTo(seconds) {
  try {
    if (!player || !player.isLoaded) {
      pendingResumePosition = seconds;
      progressStore.setState({ position: seconds });
      return;
    }
    progressStore.setState({ position: seconds });
    await player.seekTo(seconds);
  } catch (error) {
    console.error('Error seeking:', error);
  }
}

export function toggleShuffle() {
  const enabled = !playerStore.getState().shuffle;
  setQueue(Q.setShuffle(getQueue(), enabled), { shuffle: enabled });
  showToast(enabled ? 'Shuffle on' : 'Shuffle off', { icon: 'shuffle' });
}

export function cycleRepeat() {
  const order = ['off', 'all', 'one'];
  const repeat = order[(order.indexOf(playerStore.getState().repeat) + 1) % order.length];
  playerStore.setState({ repeat });
  if (player) player.loop = repeat === 'one';
  persistSoon();
  const labels = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };
  showToast(labels[repeat], { icon: 'repeat' });
}

// ── Status handling ───────────────────────────────────────────

function handleTrackFinished() {
  if (!settingsStore.getState().autoPlayNext) return;

  const next = Q.nextIndex(getQueue(), playerStore.getState().repeat);
  if (next === null) {
    // End of queue with repeat off: rewind and stop.
    player?.seekTo(0);
    progressStore.setState({ position: 0 });
    playerStore.setState({ isPlaying: false });
    return;
  }
  loadIndex(next);
}

function onPlaybackStatusUpdate(status) {
  const token = loadToken;
  const { currentId, isPlaying, isBuffering } = playerStore.getState();

  if (status.error) {
    console.error(`Playback error: ${status.error}`);
    const track = getTrack(currentId);
    const message = track && !trackFileExists(track)
      ? 'This song is no longer available on your device.'
      : `Couldn't play "${track?.title || 'this song'}" — skipped`;
    showToast(message, { icon: 'alert-circle' });
    consecutiveFailures += 1;
    if (consecutiveFailures < playerStore.getState().queue.length) skipToNextAfterError();
    return;
  }

  if (status.didJustFinish && !status.loop) {
    if (hasAdvancedForToken !== token) {
      hasAdvancedForToken = token;
      handleTrackFinished();
    }
    return;
  }

  if (status.playing) consecutiveFailures = 0;

  // Listening stats.
  const position = status.currentTime || 0;
  const previous = progressStore.getState().position;
  if (status.playing && currentId) {
    const delta = position - previous;
    if (delta > 0 && delta < 2) addListeningTime(currentId, delta);
    const threshold = Math.min(PLAY_COUNT_SECONDS, (status.duration || 60) / 2);
    if (playCountedForToken !== token && position >= threshold) {
      playCountedForToken = token;
      recordPlayCounted(currentId);
    }
  }

  progressStore.setState({ position, duration: status.duration || progressStore.getState().duration });
  if (isPlaying !== !!status.playing || isBuffering !== !!status.isBuffering) {
    playerStore.setState({ isPlaying: !!status.playing, isBuffering: !!status.isBuffering });
    if (!status.playing) persistSoon();
  }

}

function skipToNextAfterError() {
  const next = Q.nextIndex(getQueue(), 'all');
  if (next !== null) loadIndex(next);
}

// Drop tracks that disappeared after a library rescan.
libraryStore.subscribe(() => {
  const { queue } = playerStore.getState();
  if (queue.length === 0) return;
  const { byId } = libraryStore.getState();
  if (queue.every(id => byId.has(id))) return;
  const pruned = Q.pruneQueue(getQueue(), id => byId.has(id));
  setQueue(pruned);
});

export function getCurrentTrack() {
  return getTrack(playerStore.getState().currentId);
}
