/**
 * VinVibes — Bottom navigation: Home · Search · Library
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, themedStyles } from '../styles/theme';
import { useStore } from '../core/store';
import { navStore, switchTab } from '../navigation/navigation';

const ITEMS = [
  { tab: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { tab: 'search', label: 'Search', icon: 'search-outline', activeIcon: 'search' },
  { tab: 'library', label: 'Library', icon: 'library-outline', activeIcon: 'library' },
];

export default function TabBar() {
  const insets = useSafeAreaInsets();
  const active = useStore(navStore, s => s.tab);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: SIZES.tabBarHeight + insets.bottom }]} accessibilityRole="tablist">
      {ITEMS.map(item => {
        const selected = item.tab === active;
        return (
          <Pressable
            key={item.tab}
            style={styles.tab}
            onPress={() => switchTab(item.tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
          >
            <Ionicons
              name={selected ? item.activeIcon : item.icon}
              size={23}
              color={selected ? COLORS.accentLight : COLORS.textMuted}
            />
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgDeep,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  labelActive: {
    color: COLORS.textPrimary,
  },
}));
