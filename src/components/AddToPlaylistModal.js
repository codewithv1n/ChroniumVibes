/**
 * ChroniumVibes — AddToPlaylistModal
 * 
 * Bottom sheet modal to add a track to an existing or new playlist.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';
import {
  loadPlaylists,
  createPlaylist,
  addTrackToPlaylist,
} from '../player/playlistStorage';

export default function AddToPlaylistModal({ visible, track, onClose, onAdded }) {
  const [playlists, setPlaylists] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (visible) {
      loadPlaylists().then(setPlaylists);
      setShowCreate(false);
      setNewName('');
      setFeedback('');
    }
  }, [visible]);

  const handleAddToPlaylist = async (playlist) => {
    if (!track) return;
    const added = await addTrackToPlaylist(playlist.id, track);
    if (added) {
      setFeedback(`Added to "${playlist.name}"`);
      if (onAdded) onAdded();
    } else {
      setFeedback('Already in this playlist');
    }
    setTimeout(() => {
      onClose();
      setFeedback('');
    }, 800);
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) return;
    const playlist = await createPlaylist(newName);
    if (track) {
      await addTrackToPlaylist(playlist.id, track);
    }
    setFeedback(`Created "${playlist.name}" & added track`);
    if (onAdded) onAdded();
    setTimeout(() => {
      onClose();
      setFeedback('');
    }, 800);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {/* ── Header ──────────────────────────────────────── */}
            <View style={styles.handleBar} />
            <Text style={styles.sheetTitle}>Add to Playlist</Text>

            {track && (
              <Text style={styles.trackLabel} numberOfLines={1}>
                {track.title}
              </Text>
            )}

            {/* ── Feedback ────────────────────────────────────── */}
            {feedback ? (
              <View style={styles.feedbackBox}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
            ) : null}

            {/* ── Create New Playlist ─────────────────────────── */}
            {showCreate ? (
              <View style={styles.createRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Playlist name..."
                  placeholderTextColor={COLORS.textMuted}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleCreateAndAdd}
                />
                <TouchableOpacity
                  style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
                  onPress={handleCreateAndAdd}
                  disabled={!newName.trim()}
                >
                  <Text style={styles.createBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.newPlaylistRow}
                onPress={() => setShowCreate(true)}
              >
                <Ionicons name="add" size={22} color={COLORS.white} />
                <Text style={styles.newPlaylistText}>New Playlist</Text>
              </TouchableOpacity>
            )}

            {/* ── Divider ─────────────────────────────────────── */}
            <View style={styles.divider} />

            {/* ── Existing Playlists ──────────────────────────── */}
            {playlists.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No playlists yet</Text>
              </View>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                style={styles.playlistList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playlistRow}
                    onPress={() => handleAddToPlaylist(item)}
                  >
                    <View style={styles.playlistIcon}>
                      <Ionicons name="musical-notes" size={18} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName}>{item.name}</Text>
                      <Text style={styles.playlistCount}>
                        {item.tracks.length} {item.tracks.length === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>
                    <Ionicons name="add" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              />
            )}

            {/* ── Cancel ──────────────────────────────────────── */}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '70%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    ...TYPOGRAPHY.title,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  trackLabel: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: SPACING.sm,
    marginBottom: SPACING.md,
  },
  feedbackText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  newPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
  },
  newPlaylistText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
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
    paddingHorizontal: 18,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  playlistList: {
    maxHeight: 250,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    gap: SPACING.md,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.bgCardHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  playlistCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  emptyBox: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
