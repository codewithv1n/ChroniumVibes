/**
 * ChroniumVibes — TrackInfo Component
 * 
 * Displays current track artwork, title, and artist on the Now Playing screen.
 * Black & white monochrome theme.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, SIZES } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(SCREEN_WIDTH * 0.7, SIZES.artworkLarge);

export default function TrackInfo({ track }) {
  if (!track) {
    return (
      <View style={styles.container}>
        <View style={[styles.artwork, styles.artworkPlaceholder]}>
          <Ionicons name="musical-notes-outline" size={56} color={COLORS.textMuted} />
        </View>
        <Text style={styles.title}>No Track Selected</Text>
        <Text style={styles.artist}>Tap a song to play</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Album Artwork Placeholder ────────────────────── */}
      <View style={styles.artworkWrapper}>
        <View style={[styles.artwork, styles.artworkPlaceholder]}>
          <Ionicons name="musical-note" size={64} color={COLORS.textMuted} />
        </View>
      </View>

      {/* ── Song Title ─────────────────────────────────────── */}
      <Text style={styles.title} numberOfLines={2}>
        {track.title}
      </Text>

      {/* ── Artist Name ────────────────────────────────────── */}
      <Text style={styles.artist} numberOfLines={1}>
        {track.artist}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  artworkWrapper: {
    marginBottom: SPACING.xl,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.bgCard,
  },
  artworkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.title,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    maxWidth: ARTWORK_SIZE + 40,
  },
  artist: {
    ...TYPOGRAPHY.subtitle,
    textAlign: 'center',
    maxWidth: ARTWORK_SIZE,
  },
});
