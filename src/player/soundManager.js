/**
 * ChroniumVibes — Audio Engine (expo-av)
 * 
 * Manages audio playback, local track loading, play/pause, seek, 
 * and track navigation using Expo's official expo-av library.
 */

import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';

let soundObject = null;
let trackList = [];
let currentIndex = 0;
let onStatusUpdateCallback = null;

/**
 * Configure global audio mode for playback and background mode
 */
export async function initAudioEngine() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.error('Failed to set Audio mode:', error);
  }
}

/**
 * Register a listener function to receive periodic playback status updates.
 */
export function setStatusListener(callback) {
  onStatusUpdateCallback = callback;
}

/**
 * Update current playlist of scanned local tracks.
 */
export function setPlaylist(tracks) {
  trackList = tracks || [];
  currentIndex = 0;
}

export function getPlaylist() {
  return trackList;
}

export function getCurrentTrack() {
  if (trackList.length > 0 && currentIndex < trackList.length) {
    return trackList[currentIndex];
  }
  return null;
}

export function getCurrentIndex() {
  return currentIndex;
}

/**
 * Unload previous sound and play track at index safely
 */
export async function playTrackAtIndex(index) {
  if (trackList.length === 0) return;
  
  if (index < 0) index = trackList.length - 1;
  if (index >= trackList.length) index = 0;

  currentIndex = index;
  const track = trackList[currentIndex];

  try {
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }

    // Resolve file URI for Android local storage
    let audioUri = track.url;
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(track.id);
      if (assetInfo && (assetInfo.localUri || assetInfo.uri)) {
        audioUri = assetInfo.localUri || assetInfo.uri;
      }
    } catch (infoErr) {
      console.log('Using default asset url:', infoErr);
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true },
      onPlaybackStatusUpdate
    );

    soundObject = sound;
  } catch (error) {
    console.error(`Error loading track "${track.title}":`, error);
  }
}

/**
 * Toggle between play and pause
 */
export async function togglePlayPause() {
  try {
    if (!soundObject) {
      if (trackList.length > 0) {
        await playTrackAtIndex(currentIndex);
      }
      return;
    }

    const status = await soundObject.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundObject.pauseAsync();
      } else {
        await soundObject.playAsync();
      }
    } else {
      await playTrackAtIndex(currentIndex);
    }
  } catch (err) {
    console.error('Error toggling play/pause:', err);
  }
}

/**
 * Skip to next track
 */
export async function skipToNext() {
  if (trackList.length === 0) return;
  const nextIndex = (currentIndex + 1) % trackList.length;
  await playTrackAtIndex(nextIndex);
}

/**
 * Skip to previous track
 */
export async function skipToPrevious() {
  if (trackList.length === 0) return;
  const prevIndex = (currentIndex - 1 + trackList.length) % trackList.length;
  await playTrackAtIndex(prevIndex);
}

/**
 * Seek to a specific position in seconds
 */
export async function seekTo(seconds) {
  try {
    if (soundObject) {
      await soundObject.setPositionAsync(seconds * 1000);
    }
  } catch (err) {
    console.error('Error seeking:', err);
  }
}

/**
 * Internal callback for expo-av status updates
 */
function onPlaybackStatusUpdate(status) {
  if (!status.isLoaded) {
    if (status.error) {
      console.error(`Playback Error: ${status.error}`);
    }
    return;
  }

  if (status.didJustFinish && !status.isLooping) {
    skipToNext();
  }

  if (onStatusUpdateCallback) {
    onStatusUpdateCallback({
      isPlaying: status.isPlaying,
      position: (status.positionMillis || 0) / 1000,
      duration: (status.durationMillis || 0) / 1000,
      isBuffering: status.isBuffering,
    });
  }
}
