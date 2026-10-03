/**
 * VinVibes — "Save in" sheet: toggle a song in any playlist, or
 * create a new playlist inline (auto-selected). Done saves all changes.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../../styles/theme';
import { useStore } from '../../core/store';
import { showToast } from '../../core/toast';
import { pluralize } from '../../core/format';
import { libraryStore } from '../../services/libraryService';
import { playlistsStore, createPlaylist, setTrackPlaylists } from '../../services/userDataService';
import { closeSheet } from '../../navigation/navigation';
import BottomSheet from './BottomSheet';
import { CollageArtwork } from '../Artwork';

export default function AddToPlaylistSheet({ trackId }) {
  const track = useStore(libraryStore, s => s.byId.get(trackId));
  const playlists = useStore(playlistsStore, s => s.playlists);
  const byId = useStore(libraryStore, s => s.byId);

  const initial = useMemo(
    () => new Set(playlists.filter(p => p.tracks.some(t => t.id === trackId)).map(p => p.id)),
    // Only computed once when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trackId]
  );
  const [selected, setSelected] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!track) return null;

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const playlist = await createPlaylist(name);
    setSelected(prev => new Set(prev).add(playlist.id));
    setName('');
    setCreating(false);
  };

  const handleDone = async () => {
    const added = [...selected].filter(id => !initial.has(id));
    const removed = [...initial].filter(id => !selected.has(id));
    if (added.length === 0 && removed.length === 0) {
      closeSheet();
      return;
    }
    setSaving(true);
    await setTrackPlaylists(track, [...selected]);
    closeSheet();
    const names = playlistsStore.getState().playlists;
    if (added.length === 1 && removed.length === 0) {
      showToast(`Added to ${names.find(p => p.id === added[0])?.name || 'playlist'}`);
    } else if (removed.length > 0 && added.length === 0) {
      showToast(removed.length === 1 ? `Removed from ${names.find(p => p.id === removed[0])?.name || 'playlist'}` : 'Playlists updated');
    } else {
      showToast('Playlists updated');
    }
  };

  return (
    <BottomSheet title="Save in">
      <Text style={styles.trackLabel} numberOfLines={1}>{track.title}</Text>

      {creating ? (
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Playlist name"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            maxLength={60}
            accessibilityLabel="New playlist name"
          />
          <Pressable
            style={[styles.smallButton, !name.trim() && styles.disabled]}
            onPress={handleCreate}
            disabled={!name.trim()}
            accessibilityRole="button"
          >
            <Text style={styles.smallButtonText}>Create</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.row} onPress={() => setCreating(true)} accessibilityRole="button">
          <View style={styles.newIcon}>
            <Ionicons name="add" size={24} color={COLORS.white} />
          </View>
          <Text style={styles.rowTitle}>New playlist</Text>
        </Pressable>
      )}

      <FlatList
        data={playlists}
        keyExtractor={p => p.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>Create a playlist to organize your favorite tracks.</Text>}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const covers = item.tracks.slice(0, 8).map(t => byId.get(t.id)?.artwork);
          return (
            <Pressable
              style={styles.row}
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={item.name}
            >
              <CollageArtwork uris={covers} seed={item.name} size={48} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{pluralize(item.tracks.length, 'song')}</Text>
              </View>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={isSelected ? COLORS.accent : COLORS.textMuted}
              />
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.doneButton, saving && styles.disabled]}
        onPress={handleDone}
        disabled={saving}
        accessibilityRole="button"
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  trackLabel: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginTop: -4,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  list: {
    maxHeight: 340,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    minHeight: 56,
  },
  newIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...TYPOGRAPHY.body,
  },
  rowSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 1,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    backgroundColor: COLORS.bgDeep,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.accentDark,
  },
  smallButton: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
  },
  smallButtonText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.35,
  },
  empty: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  doneButton: {
    alignSelf: 'center',
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.round,
    paddingHorizontal: 48,
    minHeight: 46,
    justifyContent: 'center',
  },
  doneText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
