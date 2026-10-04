/**
 * VinVibes — Header for pushed screens (back button + title).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, themedStyles } from '../styles/theme';
import { goBack } from '../navigation/navigation';
import IconButton from './IconButton';

export default function ScreenHeader({ title, right, onBack = goBack, transparent = false }) {
  return (
    <View style={[styles.header, transparent && styles.transparent]}>
      <IconButton icon="chevron-back" size={26} onPress={onBack} label="Back" />
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = themedStyles(() => ({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLORS.bgDeep,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  title: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  right: {
    minWidth: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
}));
