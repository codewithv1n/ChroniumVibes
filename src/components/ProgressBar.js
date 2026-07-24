/**
 * ChroniumVibes — ProgressBar Component
 * 
 * A seek-able progress slider with current position and duration.
 * Black & white monochrome theme.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';

function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds < 0) return '0:00';

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ProgressBar({ position = 0, duration = 0, onSeek }) {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const handleSlidingStart = () => {
    setIsSeeking(true);
  };

  const handleValueChange = (value) => {
    if (isSeeking) {
      setSeekValue(value);
    }
  };

  const handleSlidingComplete = async (value) => {
    if (onSeek) {
      await onSeek(value);
    }
    setIsSeeking(false);
  };

  const displayPosition = isSeeking ? seekValue : position;

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        value={displayPosition}
        minimumValue={0}
        maximumValue={duration > 0 ? duration : 1}
        minimumTrackTintColor={COLORS.progressFill}
        maximumTrackTintColor={COLORS.progressTrack}
        thumbTintColor={COLORS.progressThumb}
        onSlidingStart={handleSlidingStart}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
      />

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  timeText: {
    ...TYPOGRAPHY.caption,
    fontVariant: ['tabular-nums'],
  },
});
