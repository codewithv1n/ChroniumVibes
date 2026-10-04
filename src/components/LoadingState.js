/**
 * VinVibes — Skeleton placeholders shown while the library loads,
 * plus an optional scan progress line.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, themedStyles } from '../styles/theme';

function usePulse() {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

export function SkeletonRows({ count = 8 }) {
  const opacity = usePulse();
  return (
    <Animated.View style={{ opacity }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.thumb} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: `${60 + ((i * 13) % 30)}%` }]} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

export function SkeletonCards({ count = 3 }) {
  const opacity = usePulse();
  return (
    <Animated.View style={[styles.cards, { opacity }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          <View style={styles.card} />
          <View style={[styles.line, { width: 100, marginTop: 10 }]} />
        </View>
      ))}
    </Animated.View>
  );
}

export default function LoadingState({ message = 'Scanning device...', progress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {progress ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Reading song details {progress.done} / {progress.total}
          </Text>
        </>
      ) : null}
      <SkeletonCards />
      <SkeletonRows count={6} />
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  message: {
    ...TYPOGRAPHY.section,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    height: 3,
    marginHorizontal: SPACING.md,
    borderRadius: 2,
    backgroundColor: COLORS.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.accent,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    paddingHorizontal: SPACING.md,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCardHover,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.bgCardHover,
  },
  lineShort: {
    width: '35%',
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  card: {
    width: 140,
    height: 140,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardHover,
  },
}));
