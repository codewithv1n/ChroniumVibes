/**
 * VinVibes — Seek bar with elapsed / total time.
 * Subscribes to the progress store on its own so the rest of the player
 * screen doesn't re-render twice a second.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { COLORS, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { formatTime } from '../core/format';
import { progressStore, seekTo } from '../player/playerService';

export default function ProgressBar({ fallbackDuration = 0 }) {
  const position = useStore(progressStore, s => s.position);
  const storeDuration = useStore(progressStore, s => s.duration);
  const duration = storeDuration > 0 ? storeDuration : fallbackDuration;
  const [seekValue, setSeekValue] = useState(null);

  const displayPosition = seekValue ?? position;

  return (
    <View style={styles.container}>
      <Slider
        style={styles.slider}
        value={Math.min(displayPosition, duration || 1)}
        minimumValue={0}
        maximumValue={duration > 0 ? duration : 1}
        minimumTrackTintColor={COLORS.progressFill}
        maximumTrackTintColor={COLORS.progressTrack}
        thumbTintColor={COLORS.progressThumb}
        onSlidingStart={value => setSeekValue(value)}
        onValueChange={value => seekValue !== null && setSeekValue(value)}
        onSlidingComplete={async value => {
          await seekTo(value);
          setSeekValue(null);
        }}
        accessibilityLabel="Seek"
        accessibilityValue={{ text: `${formatTime(displayPosition)} of ${formatTime(duration)}` }}
      />
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(displayPosition)}</Text>
        <Text style={styles.time}>-{formatTime(Math.max(duration - displayPosition, 0))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 36,
    marginHorizontal: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  time: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
