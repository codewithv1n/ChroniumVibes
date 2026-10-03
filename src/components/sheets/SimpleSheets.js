/**
 * VinVibes — Small generic sheets: sort picker, text prompt, lyrics,
 * and confirmation.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../styles/theme';
import { useStore } from '../../core/store';
import { libraryStore, loadLyrics } from '../../services/libraryService';
import { closeSheet } from '../../navigation/navigation';
import BottomSheet, { SheetAction } from './BottomSheet';

/** options: [{ key, label }], value: { key, ascending } */
export function SortSheet({ options, value, onChange }) {
  const select = (key) => {
    // Picking the active option again flips the direction.
    const ascending = key === value.key ? !value.ascending : options.find(o => o.key === key)?.defaultAscending ?? true;
    onChange({ key, ascending });
    closeSheet();
  };
  return (
    <BottomSheet title="Sort by">
      {options.map(option => {
        const active = option.key === value.key;
        return (
          <SheetAction
            key={option.key}
            icon={option.icon || 'swap-vertical'}
            label={option.label}
            active={active}
            onPress={() => select(option.key)}
            right={active ? (
              <Ionicons
                name={value.ascending ? 'arrow-up' : 'arrow-down'}
                size={18}
                color={COLORS.accentLight}
                accessibilityLabel={value.ascending ? 'Ascending' : 'Descending'}
              />
            ) : null}
          />
        );
      })}
    </BottomSheet>
  );
}

export function PromptSheet({ title, initialValue = '', placeholder, confirmLabel = 'Save', onSubmit }) {
  const [value, setValue] = useState(initialValue);
  const submit = async () => {
    if (!value.trim()) return;
    closeSheet();
    await onSubmit(value.trim());
  };
  return (
    <BottomSheet title={title}>
      <View style={styles.promptBody}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          autoFocus
          selectTextOnFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={submit}
          accessibilityLabel={title}
        />
        <View style={styles.buttons}>
          <Pressable style={[styles.button, styles.secondary]} onPress={closeSheet} accessibilityRole="button">
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.primary, !value.trim() && styles.disabled]}
            onPress={submit}
            disabled={!value.trim()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

export function ConfirmSheet({ title, message, confirmLabel = 'Confirm', destructive, onConfirm }) {
  return (
    <BottomSheet title={title}>
      <View style={styles.promptBody}>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.buttons}>
          <Pressable style={[styles.button, styles.secondary]} onPress={closeSheet} accessibilityRole="button">
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, destructive ? styles.danger : styles.primary]}
            onPress={() => {
              closeSheet();
              onConfirm();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

export function LyricsSheet({ trackId }) {
  const track = useStore(libraryStore, s => s.byId.get(trackId));
  const lyrics = useMemo(() => (track ? loadLyrics(track) : null), [track]);
  // Strip LRC timestamps like [01:23.45] if the embedded lyrics are synced.
  const text = lyrics ? lyrics.replace(/\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim() : null;
  return (
    <BottomSheet title="Lyrics" maxHeight={0.9}>
      <ScrollView contentContainerStyle={styles.lyricsBody}>
        {track ? <Text style={styles.lyricsTrack}>{track.title} · {track.artist}</Text> : null}
        <Text style={text ? styles.lyrics : styles.message}>
          {text || 'No lyrics available for this track.'}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  promptBody: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  input: {
    height: 50,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.bgDeep,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.accentDark,
  },
  message: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: COLORS.accent,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  secondary: {
    backgroundColor: COLORS.bgCardHover,
  },
  disabled: {
    opacity: 0.35,
  },
  primaryText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  lyricsBody: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  lyricsTrack: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  lyrics: {
    color: COLORS.textPrimary,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '600',
  },
});
