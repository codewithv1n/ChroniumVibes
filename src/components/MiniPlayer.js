/**
 * VinVibes — MiniPlayer
 *
 * Persistent bar above the tab bar. Tap to open the full player; swipe
 * left/right for next/previous. Horizontal swipes only — vertical
 * scrolling and taps pass through untouched.
 */

import React, { useRef } from 'react';
import { View, Text, Pressable, Animated, PanResponder, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SIZES, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { playerStore, progressStore, togglePlayPause, skipToNext, skipToPrevious } from '../player/playerService';
import { libraryStore } from '../services/libraryService';
import { openPlayer } from '../navigation/navigation';
import Artwork from './Artwork';
import IconButton from './IconButton';

const SWIPE_THRESHOLD = 70;

function MiniProgress() {
  const ratio = useStore(progressStore, s => (s.duration > 0 ? Math.min(s.position / s.duration, 1) : 0));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

export default function MiniPlayer() {
  const currentId = useStore(playerStore, s => s.currentId);
  const isPlaying = useStore(playerStore, s => s.isPlaying);
  const track = useStore(libraryStore, s => (currentId ? s.byId.get(currentId) : null));
  const translateX = useRef(new Animated.Value(0)).current;

  const pan = useRef(
    PanResponder.create({
      // Capture phase: claim the gesture from the Pressable only once it
      // is clearly a horizontal swipe, so taps keep working normally.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => translateX.setValue(g.dx * 0.6),
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -SWIPE_THRESHOLD) skipToNext();
        else if (g.dx >= SWIPE_THRESHOLD) skipToPrevious();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (!track) return null;

  return (
    <View style={styles.wrapper} {...pan.panHandlers}>
      <Pressable
        onPress={openPlayer}
        accessibilityRole="button"
        accessibilityLabel={`Now playing: ${track.title} by ${track.artist}. Open player`}
        accessibilityHint="Swipe left for next song, right for previous"
        style={styles.container}
      >
        <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
          <Artwork uri={track.artwork} seed={track.album} size={42} radius={6} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
          </View>
        </Animated.View>
        <IconButton
          icon={isPlaying ? 'pause' : 'play'}
          size={24}
          onPress={togglePlayPause}
          label={isPlaying ? 'Pause' : 'Play'}
        />
        <IconButton icon="play-skip-forward" size={20} color={COLORS.textSecondary} onPress={skipToNext} label="Next song" />
        <MiniProgress />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: 6,
  },
  container: {
    height: SIZES.miniPlayerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardHover,
    borderRadius: RADIUS.md,
    paddingLeft: 10,
    paddingRight: 4,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.black,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 1,
  },
  progressTrack: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.progressTrack,
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
  },
});
