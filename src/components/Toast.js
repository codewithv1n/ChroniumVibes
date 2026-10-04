/**
 * VinVibes — Toast host (renders the current toast above the nav).
 */

import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, themedStyles } from '../styles/theme';
import { useStore } from '../core/store';
import { toastStore } from '../core/toast';

export default function Toast({ bottomOffset = 140 }) {
  const toast = useStore(toastStore, s => s.toast);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: toast ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [toast, anim]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { bottom: bottomOffset, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      <Ionicons name={toast.icon} size={18} color={COLORS.accentLight} />
      <Text style={styles.text} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = themedStyles(() => ({
  toast: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.toast,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    elevation: 12,
    shadowColor: COLORS.black,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  text: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
}));
