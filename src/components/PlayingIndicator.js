/**
 * VinVibes — Animated equalizer bars for the playing track.
 * Static when paused or when animations are turned off in Settings.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { COLORS, themedStyles } from '../styles/theme';
import { useStore } from '../core/store';
import { settingsStore } from '../services/userDataService';

const BARS = [0.55, 1, 0.75];

export default function PlayingIndicator({ playing = true, color = COLORS.accentLight, height = 14 }) {
  const animationsOn = useStore(settingsStore, s => s.animations);
  const values = useRef(BARS.map(v => new Animated.Value(v))).current;

  useEffect(() => {
    if (!playing || !animationsOn) {
      values.forEach((v, i) => v.setValue(BARS[i] * 0.6));
      return undefined;
    }
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 320 + i * 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 320 + i * 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [playing, animationsOn, values]);

  return (
    <View style={[styles.row, { height }]} accessibilityLabel={playing ? 'Now playing' : 'Paused'}>
      {values.map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.bar, { height, backgroundColor: color, transform: [{ scaleY: v }] }]}
        />
      ))}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    transformOrigin: 'bottom',
  },
}));
