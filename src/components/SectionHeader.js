/**
 * VinVibes — Section title with an optional "See all" action.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, themedStyles } from '../styles/theme';

function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${actionLabel}: ${title}`}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    marginBottom: 12,
    gap: SPACING.md,
  },
  text: {
    flex: 1,
  },
  subtitle: {
    ...TYPOGRAPHY.micro,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  title: {
    ...TYPOGRAPHY.section,
  },
  action: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
}));

export default memo(SectionHeader);
