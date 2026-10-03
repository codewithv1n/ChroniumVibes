
import React, { useState, useMemo } from 'react';
import { View, Text, Modal, Pressable, FlatList, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { normalizeText } from '../core/format';
import { libraryStore } from '../services/libraryService';
import Artwork from './Artwork';
import IconButton from './IconButton';

const ROW_HEIGHT = 64;

export default function AddSongsModal({ visible, title, subtitle, selectedIds, onToggle, onClose }) {
  const insets = useSafeAreaInsets();
  const tracks = useStore(libraryStore, s => s.tracks);
  const [query, setQuery] = useState('');

  // Normalize once per library change, not on every keystroke.
  const keys = useMemo(() => tracks.map(t => normalizeText(`${t.title} ${t.artist} ${t.album}`)), [tracks]);
  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return tracks;
    return tracks.filter((_, i) => keys[i].includes(q));
  }, [tracks, keys, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <IconButton icon="close" size={26} onPress={onClose} label="Close" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search songs"
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            accessibilityLabel="Search songs to add"
          />
          {query.length > 0 && (
            <IconButton icon="close-circle" size={18} color={COLORS.textMuted} onPress={() => setQuery('')} label="Clear search" />
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
          initialNumToRender={14}
          windowSize={11}
          ListEmptyComponent={<Text style={styles.empty}>No songs match "{query}"</Text>}
          renderItem={({ item }) => {
            const added = selectedIds.has(item.id);
            return (
              <Pressable
                style={styles.row}
                onPress={() => onToggle(item, added)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: added }}
                accessibilityLabel={`${item.title} by ${item.artist}`}
              >
                <Artwork uri={item.artwork} seed={item.album} size={46} />
                <View style={styles.rowText}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>{item.artist}</Text>
                </View>
                <Ionicons
                  name={added ? 'checkmark-circle' : 'add-circle-outline'}
                  size={28}
                  color={added ? COLORS.accent : COLORS.textSecondary}
                />
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  done: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  doneText: {
    color: COLORS.accentLight,
    fontSize: 15,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingLeft: 12,
    height: 46,
    backgroundColor: COLORS.bgCardHover,
    borderRadius: RADIUS.md,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.body,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  empty: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    padding: SPACING.xl,
  },
});
