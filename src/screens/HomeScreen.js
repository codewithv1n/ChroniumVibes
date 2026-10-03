/**
 * VinVibes — Home
 *
 * Greeting, quick shortcuts and sections built only from the local
 * library and local listening history.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet } from 'react-native';
import { SPACING, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { greeting, pluralize } from '../core/format';
import { libraryStore } from '../services/libraryService';
import { statsStore, favoritesStore, playlistsStore, getFavoriteIds } from '../services/userDataService';
import * as Rec from '../services/recommendations';
import { playTracks } from '../player/playerService';
import { navigate, openLibraryView } from '../navigation/navigation';
import SectionHeader from '../components/SectionHeader';
import SongTile from '../components/SongTile';
import IconButton from '../components/IconButton';
import { TrackCard, PlaylistCard, QuickTile } from '../components/Cards';

function HorizontalRow({ data, renderItem, keyExtractor = item => item.id }) {
  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rowContent}
      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      initialNumToRender={4}
    />
  );
}

export default function HomeScreen() {
  const tracks = useStore(libraryStore, s => s.tracks);
  const byId = useStore(libraryStore, s => s.byId);
  const stats = useStore(statsStore, s => s.stats);
  const favorites = useStore(favoritesStore, s => s.favorites);
  const playlists = useStore(playlistsStore, s => s.playlists);

  const sections = useMemo(() => {
    return {
      picks: Rec.quickPicks(tracks, stats, favorites, 8),
      rediscover: Rec.rediscover(tracks, stats, 10),
      favoriteIds: getFavoriteIds(favorites).filter(id => byId.has(id)),
    };
  }, [tracks, byId, stats, favorites]);

  const playSingleFrom = useCallback((list) => (track) => {
    playTracks(list.map(t => t.id), list.indexOf(track));
  }, []);

  const openCollection = (type, params = {}) => navigate(type, params);
  const firstFavoriteArt = sections.favoriteIds.map(id => byId.get(id)?.artwork).find(Boolean);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting} accessibilityRole="header">{greeting()}</Text>
          <Text style={styles.count}>
            You have {pluralize(tracks.length, 'song')} on this device
          </Text>
        </View>
        <IconButton icon="settings-outline" size={22} onPress={() => navigate('settings')} label="Settings" />
      </View>

      {/* ── Quick shortcuts ────────────────────────────────── */}
      <View style={styles.quickGrid}>
        <View style={styles.quickRow}>
          <QuickTile icon="heart" label="Favorites" artwork={firstFavoriteArt || null} seed="favorites"
            onPress={() => openCollection('collection', { kind: 'favorites' })} />
          <QuickTile icon="musical-notes" label="All songs" onPress={() => openCollection('collection', { kind: 'allSongs' })} />
        </View>
        <View style={styles.quickRow}>
          <QuickTile icon="folder" label="Folders" onPress={() => openLibraryView('folders')} />
          <QuickTile icon="list" label="Playlists" onPress={() => openLibraryView('playlists')} />
        </View>
      </View>

      {sections.picks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Quick picks" subtitle="From your listening" />
          {sections.picks.slice(0, 4).map((track, i) => (
            <SongTile key={track.id} track={track} index={i} onPress={playSingleFrom(sections.picks)} />
          ))}
        </View>
      )}

      {playlists.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Your playlists" actionLabel="See all"
            onAction={() => openLibraryView('playlists')} />
          <HorizontalRow data={playlists} renderItem={({ item }) => (
            <PlaylistCard
              playlist={item}
              coverUris={item.tracks.slice(0, 8).map(t => byId.get(t.id)?.artwork)}
              onPress={p => openCollection('playlist', { playlistId: p.id })}
            />
          )} />
        </View>
      )}

      {sections.rediscover.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Rediscover" subtitle="Not played in a while" />
          <HorizontalRow data={sections.rediscover} renderItem={({ item }) => <TrackCard track={item} onPress={playSingleFrom(sections.rediscover)} />} />
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    ...TYPOGRAPHY.display,
  },
  count: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  quickGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  section: {
    marginTop: SPACING.lg,
  },
  rowContent: {
    paddingHorizontal: SPACING.md,
  },
});

