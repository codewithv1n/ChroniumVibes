/**
 * ChroniumVibes — TrackList Component
 * 
 * Full-screen scrollable list of all downloaded tracks.
 * Tap to play, press "+" to add to playlist.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../styles/theme';

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  onTrackPress,
  onAddToPlaylist,
}) {
  const renderTrack = ({ item, index }) => {
    const isActive = item.id === currentTrackId;

    return (
      <TouchableOpacity
        style={[styles.trackRow, isActive && styles.trackRowActive]}
        onPress={() => onTrackPress(index)}
        activeOpacity={0.6}
      >
        {/* ── Track Number / Playing Indicator ──────────── */}
        <View style={styles.indexCol}>
          {isActive && isPlaying ? (
            <View style={styles.playingBars}>
              <View style={[styles.bar, styles.bar1]} />
              <View style={[styles.bar, styles.bar2]} />
              <View style={[styles.bar, styles.bar3]} />
            </View>
          ) : (
            <Text style={[styles.indexText, isActive && styles.activeText]}>
              {index + 1}
            </Text>
          )}
        </View>

        {/* ── Track Info ─────────────────────────────────── */}
        <View style={styles.trackInfo}>
          <Text
            style={[styles.trackTitle, isActive && styles.activeText]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>

        {/* ── Duration ───────────────────────────────────── */}
        <Text style={styles.duration}>
          {formatDuration(item.duration)}
        </Text>

        {/* ── Add to Playlist Button ─────────────────────── */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onAddToPlaylist(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add-circle-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes-outline" size={48} color={COLORS.textMuted} />
      <Text style={styles.emptyText}>No downloaded music found</Text>
      <Text style={styles.emptySubtext}>
        Download some MP3 files to your phone
      </Text>
    </View>
  );

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id}
      renderItem={renderTrack}
      ListEmptyComponent={renderEmpty}
      contentContainerStyle={tracks.length === 0 ? styles.emptyList : styles.listContent}
      showsVerticalScrollIndicator={false}
      initialNumToRender={20}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 140, // Space for mini player + tab bar
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  trackRowActive: {
    backgroundColor: COLORS.activeRow,
  },
  indexCol: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  activeText: {
    color: COLORS.white,
  },
  playingBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    gap: 2,
  },
  bar: {
    width: 3,
    backgroundColor: COLORS.white,
    borderRadius: 1,
  },
  bar1: { height: 8 },
  bar2: { height: 14 },
  bar3: { height: 10 },
  trackInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  duration: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
    marginRight: SPACING.sm,
  },
  addButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
});
