/**
 * VinVibes — Bottom sheet base + action row.
 */

import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../styles/theme';
import { closeSheet } from '../../navigation/navigation';

export default function BottomSheet({ children, title, onClose = closeSheet, maxHeight = '85%' }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.avoider}>
          <Pressable style={[styles.sheet, { maxHeight, paddingBottom: insets.bottom + SPACING.md }]} onPress={() => {}}>
            <View style={styles.handle} />
            {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export function SheetAction({ icon, label, onPress, active, destructive, right }) {
  const color = destructive ? COLORS.danger : active ? COLORS.accentLight : COLORS.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active !== undefined ? { selected: !!active } : undefined}
      android_ripple={{ color: COLORS.accentSoft }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={destructive ? COLORS.danger : active ? COLORS.accentLight : COLORS.textSecondary} />
      <Text style={[styles.actionLabel, { color }]} numberOfLines={1}>{label}</Text>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: 'flex-end',
  },
  avoider: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.section,
    fontSize: 17,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  pressed: {
    backgroundColor: COLORS.bgCardHover,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
