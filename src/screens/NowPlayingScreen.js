/**
 * VinVibes — Full player
 *
 * Shown in a Modal: a separate native window that always sits above the
 * app and slides up natively (an in-app absolute overlay got stuck under
 * the tab bar on some Android devices). Swipe down on the top area (or
 * press back / the chevron) to minimize. Artwork cross-fades between tracks; the
 * background takes a subtle tint per album over a black base.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, Animated, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, placeholderColors } from '../styles/theme';
import { useStore } from '../core/store';
import { showToast } from '../core/toast';
import { libraryStore, UNKNOWN_ALBUM } from '../services/libraryService';
import { favoritesStore, settingsStore, toggleFavorite } from '../services/userDataService';
import {
  playerStore,
  togglePlayPause,
  skipToNext,
  skipToPrevious,
  toggleShuffle,
  cycleRepeat,
} from '../player/playerService';
import { navStore, closePlayer, openSheet } from '../navigation/navigation';
import Artwork from '../components/Artwork';
import IconButton from '../components/IconButton';
import ProgressBar from '../components/ProgressBar';
import Toast from '../components/Toast';

function FavoriteButton({ trackId }) {
  const liked = useStore(favoritesStore, s => !!s.favorites[trackId]);
  const scale = useRef(new Animated.Value(1)).current;
  const onPress = () => {
    const now = toggleFavorite(trackId);
    showToast(now ? 'Added to Favorites' : 'Removed from Favorites', { icon: now ? 'heart' : 'heart-dislike-outline' });
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <IconButton
        icon={liked ? 'heart' : 'heart-outline'}
        size={28}
        color={liked ? COLORS.favorite : COLORS.textSecondary}
        onPress={onPress}
        label={liked ? 'Remove from Favorites' : 'Add to Favorites'}
      />
    </Animated.View>
  );
}

function PlayPauseButton() {
  const isPlaying = useStore(playerStore, s => s.isPlaying);
  return (
    <Pressable
      onPress={togglePlayPause}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}
    >
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={COLORS.white} style={!isPlaying && styles.playIconOffset} />
    </Pressable>
  );
}

/** Lyrics button, shown only for songs with embedded lyrics. */
function LyricsButton({ track }) {
  if (!track.hasLyrics) return null;
  return (
    <View style={styles.secondaryRow}>
      <Pressable style={styles.secondaryButton} onPress={() => openSheet('lyrics', { trackId: track.id })} accessibilityRole="button" accessibilityLabel="Lyrics">
        <Ionicons name="chatbox-ellipses-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.secondaryText}>Lyrics</Text>
      </Pressable>
    </View>
  );
}

export default function NowPlayingScreen() {
  const open = useStore(navStore, s => s.playerOpen);
  const currentId = useStore(playerStore, s => s.currentId);
  const track = useStore(libraryStore, s => (currentId ? s.byId.get(currentId) : null));
  const animationsOn = useStore(settingsStore, s => s.animations);

  return (
    <Modal
      visible={open && !!track}
      animationType={animationsOn ? 'slide' : 'none'}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={closePlayer}
    >
      {track ? <PlayerSheet track={track} /> : null}
    </Modal>
  );
}

// Lifts the controls off the bottom edge so they're easy to reach.
const CONTROLS_BOTTOM_SPACE = 56;

function PlayerSheet({ track }) {
  const currentId = track.id;
  const shuffle = useStore(playerStore, s => s.shuffle);
  const repeat = useStore(playerStore, s => s.repeat);
  const animationsOn = useStore(settingsStore, s => s.animations);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Only used while dragging down to dismiss.
  const translateY = useRef(new Animated.Value(0)).current;
  const artOpacity = useRef(new Animated.Value(1)).current;

  // Cross-fade artwork when the track changes (not on first open).
  const firstTrack = useRef(currentId);
  useEffect(() => {
    if (!animationsOn || currentId === firstTrack.current) return;
    firstTrack.current = null;
    artOpacity.setValue(0.25);
    Animated.timing(artOpacity, { toValue: 1, duration: 320, useNativeDriver: false }).start();
  }, [currentId, artOpacity, animationsOn]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 140 || g.vy > 1.2) {
          closePlayer();
          // Reset after the Modal has slid away.
          setTimeout(() => translateY.setValue(0), 400);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: false }).start(),
    })
  ).current;

  const artSize = Math.min(width - SPACING.lg * 2, height * 0.42, 420);
  const [tint] = placeholderColors(track.album);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <LinearGradient colors={[`${tint}66`, COLORS.bgDeep, COLORS.bgDeep]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.inner, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, SPACING.md) + CONTROLS_BOTTOM_SPACE }]}>
        {/* ── Top bar (also the swipe-down handle) ─────────── */}
        <View style={styles.topBar} {...pan.panHandlers}>
          <IconButton icon="chevron-down" size={28} onPress={closePlayer} label="Minimize player" />
          <View style={styles.topText}>
            <Text style={styles.topLabel}>NOW PLAYING</Text>
            {track.album !== UNKNOWN_ALBUM ? (
              <Text style={styles.topAlbum} numberOfLines={1}>{track.album}</Text>
            ) : null}
          </View>
          <IconButton icon="ellipsis-vertical" size={22} onPress={() => openSheet('songActions', { trackId: track.id })} label="More options" />
        </View>

        {/* ── Artwork ──────────────────────────────────────── */}
        <View style={styles.artworkArea} {...pan.panHandlers}>
          <Animated.View style={[styles.artworkShadow, { opacity: artOpacity }]}>
            <Artwork uri={track.artwork} seed={track.album} size={artSize} radius={RADIUS.lg} />
          </Animated.View>
        </View>

        {/* ── Title + favorite ─────────────────────────────── */}
        <View style={styles.titleRow}>
          <View style={styles.titleText}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
          </View>
          <FavoriteButton trackId={track.id} />
        </View>

        <ProgressBar fallbackDuration={track.duration} />

        {/* ── Transport controls ───────────────────────────── */}
        <View style={styles.controls}>
          <IconButton
            icon="shuffle"
            size={24}
            color={shuffle ? COLORS.accentLight : COLORS.textSecondary}
            onPress={toggleShuffle}
            label={shuffle ? 'Shuffle on' : 'Shuffle off'}
            accessibilityState={{ selected: shuffle }}
          />
          <IconButton icon="play-skip-back" size={30} onPress={skipToPrevious} label="Previous song" />
          <PlayPauseButton />
          <IconButton icon="play-skip-forward" size={30} onPress={skipToNext} label="Next song" />
          <View>
            <IconButton
              icon="repeat"
              size={24}
              color={repeat === 'off' ? COLORS.textSecondary : COLORS.accentLight}
              onPress={cycleRepeat}
              label={repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one'}
            />
            {repeat === 'one' ? <Text style={styles.repeatOne} pointerEvents="none">1</Text> : null}
          </View>
        </View>

        <LyricsButton track={track} />

      </View>
      <Toast bottomOffset={insets.bottom + SPACING.lg} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -SPACING.sm,
    height: 56,
  },
  topText: {
    flex: 1,
    alignItems: 'center',
  },
  topLabel: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textSecondary,
  },
  topAlbum: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  artworkArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 160,
  },
  artworkShadow: {
    shadowColor: COLORS.black,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
    borderRadius: RADIUS.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.title,
  },
  artist: {
    ...TYPOGRAPHY.subtitle,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  playPressed: {
    transform: [{ scale: 0.94 }],
  },
  playIconOffset: {
    marginLeft: 4,
  },
  repeatOne: {
    position: 'absolute',
    right: 8,
    top: 8,
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.accentLight,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
  },
  secondaryButton: {
    alignItems: 'center',
    minWidth: 72,
    minHeight: 44,
    gap: 4,
  },
  secondaryText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
