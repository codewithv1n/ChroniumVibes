/**
 * VinVibes — Play queue
 *
 * Now playing + next in queue. Tap to jump, move songs up/down, remove
 * (⋮ menu), clear, or add songs. The queue is saved and restored on next launch
 * (Settings > Remember queue).
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { pluralize, formatTotalDuration } from '../core/format';
import { libraryStore } from '../services/libraryService';
import {
  playerStore,
  skipToQueueIndex,
  removeFromQueue,
  moveInQueue,
  clearQueue,
  addToQueue,
} from '../player/playerService';
import { navStore, closeQueue } from '../navigation/navigation';
import SongTile from '../components/SongTile';
import IconButton from '../components/IconButton';
import EmptyState from '../components/EmptyState';
import AddSongsModal from '../components/AddSongsModal';

export default function QueueScreen() {
  const open = useStore(navStore, s => s.queueOpen);
  const queue = useStore(playerStore, s => s.queue);
  const index = useStore(playerStore, s => s.index);
  const shuffle = useStore(playerStore, s => s.shuffle);
  const byId = useStore(libraryStore, s => s.byId);
  const insets = useSafeAreaInsets();
  const [adding, setAdding] = useState(false);

  const current = byId.get(queue[index]);
  const upcoming = useMemo(
    () => queue.slice(index + 1).map((id, i) => ({ track: byId.get(id), position: index + 1 + i })).filter(e => e.track),
    [queue, index, byId]
  );
  const upcomingDuration = upcoming.reduce((sum, e) => sum + (e.track.duration || 0), 0);

  const renderItem = useCallback(({ item, index: i }) => (
    <SongTile
      track={item.track}
      index={item.position}
      onPress={() => skipToQueueIndex(item.position)}
      context={{ queueIndex: item.position }}
      right={
        <View style={styles.rowActions}>
          <IconButton icon="chevron-up" size={18} color={COLORS.textSecondary} disabled={i === 0}
            onPress={() => moveInQueue(item.position, item.position - 1)} label={`Move ${item.track.title} up`} />
          <IconButton icon="chevron-down" size={18} color={COLORS.textSecondary} disabled={i === upcoming.length - 1}
            onPress={() => moveInQueue(item.position, item.position + 1)} label={`Move ${item.track.title} down`} />
        </View>
      }
    />
  ), [upcoming.length]);

  if (!open) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
      <View style={styles.header}>
        <IconButton icon="chevron-down" size={28} onPress={closeQueue} label="Close queue" />
        <Text style={styles.headerTitle} accessibilityRole="header">Queue</Text>
        <IconButton icon="add" size={26} onPress={() => setAdding(true)} label="Add songs to queue" />
      </View>

      <FlatList
        data={upcoming}
        keyExtractor={item => `${item.track.id}:${item.position}`}
        renderItem={renderItem}
        initialNumToRender={12}
        windowSize={9}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {current ? (
              <>
                <Text style={styles.sectionLabel}>NOW PLAYING</Text>
                <SongTile track={current} index={index} onPress={() => {}} />
              </>
            ) : null}
            <View style={styles.nextHeader}>
              <View style={styles.flex}>
                <Text style={styles.sectionLabel}>NEXT IN QUEUE{shuffle ? ' · SHUFFLED' : ''}</Text>
                {upcoming.length ? (
                  <Text style={styles.nextMeta}>{pluralize(upcoming.length, 'song')} · {formatTotalDuration(upcomingDuration)}</Text>
                ) : null}
              </View>
              {upcoming.length ? (
                <Pressable onPress={clearQueue} hitSlop={10} accessibilityRole="button" style={styles.clearButton}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState compact icon="list-outline" title="Nothing up next" message="Add songs to keep the music going." actionLabel="Add songs" onAction={() => setAdding(true)} />
        }
      />

      <AddSongsModal
        visible={adding}
        title="Add to queue"
        subtitle="Tap songs to add them to the end of the queue"
        selectedIds={new Set(queue.slice(index + 1))}
        onToggle={(track, added) => {
          if (added) {
            const pos = queue.lastIndexOf(track.id);
            if (pos > index) removeFromQueue(pos);
          } else {
            addToQueue(track.id);
          }
        }}
        onClose={() => setAdding(false)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bgDeep,
    zIndex: 30,
    elevation: 30,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLabel: {
    ...TYPOGRAPHY.micro,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  nextMeta: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  clearButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  clearText: {
    color: COLORS.accentLight,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    marginRight: -6,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
});
