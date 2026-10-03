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
import { libraryStore, albumIdFor } from '../services/libraryService';
import { statsStore, favoritesStore, playlistsStore, getFavoriteIds } from '../services/userDataService';
import * as Rec from '../services/recommendations';
import { playTracks } from '../player/playerService';
import { navigate, openLibraryView } from '../navigation/navigation';
import SectionHeader from '../components/SectionHeader';
import SongTile from '../components/SongTile';
import IconButton from '../components/IconButton';
import { TrackCard, MixCard, PlaylistCard, AlbumCard, QuickTile } from '../components/Cards';

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
  const artists = useStore(libraryStore, s => s.artists);
  const albums = useStore(libraryStore, s => s.albums);
  const byId = useStore(libraryStore, s => s.byId);
  const stats = useStore(statsStore, s => s.stats);
  const favorites = useStore(favoritesStore, s => s.favorites);
  const playlists = useStore(playlistsStore, s => s.playlists);

  const sections = useMemo(() => {
    const topArtist = Rec.topRecentArtist(tracks, stats);
    return {
      recent: Rec.recentlyPlayed(tracks, stats, 12),
      picks: Rec.quickPicks(tracks, stats, favorites, 8),
      mixes: Rec.libraryMixes(tracks, artists, stats, 4),
      mostPlayed: Rec.mostPlayed(tracks, stats, 5),
      recentlyAdded: Rec.recentlyAdded(tracks, 5),
      topArtist,
      because: Rec.becauseYouListened(tracks, stats, topArtist, 10),
      rediscover: Rec.rediscover(tracks, stats, 10),
      favoriteIds: getFavoriteIds(favorites).filter(id => byId.has(id)),
      // Albums whose songs were played most recently.
      recentAlbums: (() => {
        const albumsById = new Map(albums.map(a => [a.id, a]));
        const seen = new Set();
        const out = [];
        for (const t of Rec.recentlyPlayed(tracks, stats, 60)) {
          const album = albumsById.get(albumIdFor(t));
          if (album && !seen.has(album.id) && album.trackIds.length > 1) {
            seen.add(album.id);
            out.push(album);
          }
          if (out.length >= 8) break;
        }
        return out;
      })(),
    };
  }, [tracks, artists, albums, byId, stats, favorites]);

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
          <QuickTile icon="time" label="Recently added"
            onPress={() => openCollection('collection', { kind: 'recentlyAdded' })} />
        </View>
        <View style={styles.quickRow}>
          <QuickTile icon="disc" label="Albums" onPress={() => openLibraryView('albums')} />
          <QuickTile icon="list" label="Playlists" onPress={() => openLibraryView('playlists')} />
        </View>
        <View style={styles.quickRow}>
          <QuickTile icon="stats-chart" label="Most played"
            onPress={() => openCollection('collection', { kind: 'mostPlayed' })} />
          <QuickTile icon="musical-notes" label="All songs" onPress={() => openCollection('collection', { kind: 'allSongs' })} />
        </View>
      </View>

      {sections.recent.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Recently played" actionLabel="See all"
            onAction={() => openCollection('collection', { kind: 'recentlyPlayed' })} />
          <HorizontalRow data={sections.recent} renderItem={({ item }) => <TrackCard track={item} onPress={playSingleFrom(sections.recent)} />} />
        </View>
      )}

      {sections.picks.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Quick picks" subtitle="From your listening" />
          {sections.picks.slice(0, 4).map((track, i) => (
            <SongTile key={track.id} track={track} index={i} onPress={playSingleFrom(sections.picks)} />
          ))}
        </View>
      )}

      {sections.mixes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Made from your library" />
          <HorizontalRow data={sections.mixes} renderItem={({ item }) => (
            <MixCard mix={item} onPress={mix => openCollection('collection', { kind: 'mix', mix })} />
          )} />
        </View>
      )}

      {sections.because.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={sections.topArtist} subtitle="Because you listened to" />
          <HorizontalRow data={sections.because} renderItem={({ item }) => <TrackCard track={item} onPress={playSingleFrom(sections.because)} />} />
        </View>
      )}

      {sections.recentAlbums.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Jump back in" subtitle="Albums" />
          <HorizontalRow data={sections.recentAlbums} renderItem={({ item }) => (
            <AlbumCard album={item} onPress={album => openCollection('album', { albumId: album.id })} />
          )} />
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

      {sections.mostPlayed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Most played" actionLabel="See all"
            onAction={() => openCollection('collection', { kind: 'mostPlayed' })} />
          {sections.mostPlayed.map((track, i) => (
            <SongTile key={track.id} track={track} index={i} onPress={playSingleFrom(sections.mostPlayed)} />
          ))}
        </View>
      )}

      {sections.rediscover.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Rediscover" subtitle="Not played in a while" />
          <HorizontalRow data={sections.rediscover} renderItem={({ item }) => <TrackCard track={item} onPress={playSingleFrom(sections.rediscover)} />} />
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="Recently added" actionLabel="See all"
          onAction={() => openCollection('collection', { kind: 'recentlyAdded' })} />
        {sections.recentlyAdded.map((track, i) => (
          <SongTile key={track.id} track={track} index={i} onPress={playSingleFrom(sections.recentlyAdded)} />
        ))}
      </View>
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

