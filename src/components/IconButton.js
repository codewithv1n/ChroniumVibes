/**
 * VinVibes — IconButton with a guaranteed 44px touch target.
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../styles/theme';

function IconButton({ icon, onPress, size = 22, color = COLORS.textPrimary, label, disabled, style, hitSlop = 6, ...rest }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled, style]}
      {...rest}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: SIZES.touchTarget,
    minHeight: SIZES.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.touchTarget / 2,
  },
  pressed: {
    opacity: 0.55,
  },
  disabled: {
    opacity: 0.3,
  },
});

export default memo(IconButton);
