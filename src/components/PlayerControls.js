/**
 * ChroniumVibes — PlayerControls Component
 * 
 * Play/Pause toggle with Skip Previous and Skip Next buttons.
 * Black & white monochrome theme.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SIZES } from '../styles/theme';

export default function PlayerControls({
  isPlaying,
  isBuffering,
  onTogglePlayPause,
  onSkipNext,
  onSkipPrevious,
}) {
  return (
    <View style={styles.container}>
      {/* ── Skip Previous ────────────────────────────────── */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onSkipPrevious}
        activeOpacity={0.6}
      >
        <Ionicons
          name="play-skip-back"
          size={24}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {/* ── Play / Pause / Loading ────────────────────────── */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={onTogglePlayPause}
        activeOpacity={0.7}
        disabled={isBuffering}
      >
        {isBuffering ? (
          <ActivityIndicator size="large" color={COLORS.black} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={28}
            color={COLORS.black}
            style={isPlaying ? {} : { marginLeft: 3 }}
          />
        )}
      </TouchableOpacity>

      {/* ── Skip Next ─────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onSkipNext}
        activeOpacity={0.6}
      >
        <Ionicons
          name="play-skip-forward"
          size={24}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xl,
  },
  sideButton: {
    width: SIZES.controlButtonSmall,
    height: SIZES.controlButtonSmall,
    borderRadius: SIZES.controlButtonSmall / 2,
    backgroundColor: COLORS.bgCardHover,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: SIZES.controlButton,
    height: SIZES.controlButton,
    borderRadius: SIZES.controlButton / 2,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
