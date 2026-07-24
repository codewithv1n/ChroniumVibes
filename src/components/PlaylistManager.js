/**
 * ChroniumVibes — PlaylistManager Component
 * 
 * Screen to view, create, and manage playlists.
 * Tap a playlist to see its tracks and play them.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';
import {
  loadPlaylists,
  createPlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
} from '../player/playlistStorage';

export default function PlaylistManager({ onPlayPlaylist, onRefresh }) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const refresh = useCallback(async () => {
    const loaded = await loadPlaylists();
    setPlaylists(loaded);
    // Refresh selected playlist if it was open
    if (selectedPlaylist) {
      const updated = loaded.find(p => p.id === selectedPlaylist.id);
      setSelectedPlaylist(updated || null);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    refresh();
  }, [onRefresh]);

  // Initial load
  useEffect(() => {
    loadPlaylists().then(setPlaylists);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPlaylist(newName);
    setNewName('');
    setShowCreate(false);
    await refresh();
  };

  const handleDelete = (playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Delete "${playlist.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlist.id);
            if (selectedPlaylist?.id === playlist.id) {
              setSelectedPlaylist(null);
            }
            await refresh();
          },
        },
      ]
    );
  };

  const handleRemoveTrack = async (trackId) => {
    if (!selectedPlaylist) return;
    await removeTrackFromPlaylist(selectedPlaylist.id, trackId);
    await refresh();
  };

  const handlePlayPlaylist = (playlist) => {
    if (playlist.tracks.length > 0 && onPlayPlaylist) {
      onPlayPlaylist(playlist.tracks);
    }
  };

  // ── Playlist Detail View ──────────────────────────────
  if (selectedPlaylist) {
    return (
      <View style={styles.container}>
        {/* Back button + Playlist header */}
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => setSelectedPlaylist(null)}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
          <Text style={styles.backText}>Playlists</Text>
        </TouchableOpacity>

        <View style={styles.detailHeader}>
          <View style={styles.detailIconBox}>
            <Ionicons name="musical-notes" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.detailTitle}>{selectedPlaylist.name}</Text>
          <Text style={styles.detailCount}>
            {selectedPlaylist.tracks.length}{' '}
            {selectedPlaylist.tracks.length === 1 ? 'song' : 'songs'}
          </Text>

          {selectedPlaylist.tracks.length > 0 && (
            <TouchableOpacity
              style={styles.playAllBtn}
              onPress={() => handlePlayPlaylist(selectedPlaylist)}
            >
              <Ionicons name="play" size={18} color={COLORS.black} />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={selectedPlaylist.tracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={selectedPlaylist.tracks.length === 0 ? styles.emptyDetail : styles.detailList}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="disc-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No songs in this playlist</Text>
              <Text style={styles.emptySubtext}>
                Go to Songs tab and tap + to add
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.detailTrackRow}>
              <Text style={styles.detailIndex}>{index + 1}</Text>
              <View style={styles.detailTrackInfo}>
                <Text style={styles.detailTrackTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.detailTrackArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveTrack(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    );
  }

  // ── Playlists Overview ────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Create new playlist */}
      {showCreate ? (
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter playlist name..."
            placeholderTextColor={COLORS.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!newName.trim()}
          >
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowCreate(false); setNewName(''); }}
          >
            <Ionicons name="close" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.newPlaylistBtn}
          onPress={() => setShowCreate(true)}
        >
          <View style={styles.newPlaylistIcon}>
            <Ionicons name="add" size={24} color={COLORS.white} />
          </View>
          <Text style={styles.newPlaylistText}>Create New Playlist</Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />

      {/* Playlist list */}
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={playlists.length === 0 ? styles.emptyListContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="list-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No playlists yet</Text>
            <Text style={styles.emptySubtext}>
              Create a playlist to organize your music
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playlistRow}
            onPress={() => setSelectedPlaylist(item)}
            onLongPress={() => handleDelete(item)}
          >
            <View style={styles.playlistIcon}>
              <Ionicons name="musical-notes" size={22} color={COLORS.textSecondary} />
            </View>
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>{item.name}</Text>
              <Text style={styles.playlistCount}>
                {item.tracks.length} {item.tracks.length === 1 ? 'song' : 'songs'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: COLORS.white,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  createBtnDisabled: {
    opacity: 0.3,
  },
  createBtnText: {
    color: COLORS.black,
    fontWeight: '600',
    fontSize: 14,
  },
  newPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: SPACING.md,
  },
  newPlaylistIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.bgCardHover,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newPlaylistText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  listContent: {
    paddingBottom: 140,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  playlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.bgCardHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  playlistCount: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },

  // ── Detail View ────────────────────────────────────
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    gap: 4,
  },
  backText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '500',
  },
  detailHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  detailIconBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: COLORS.bgCardHover,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailTitle: {
    ...TYPOGRAPHY.title,
    fontSize: 20,
    marginBottom: 4,
  },
  detailCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  playAllText: {
    color: COLORS.black,
    fontWeight: '600',
    fontSize: 14,
  },
  detailList: {
    paddingBottom: 140,
  },
  emptyDetail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  detailIndex: {
    width: 28,
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  detailTrackInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  detailTrackTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  detailTrackArtist: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 1,
  },
});
