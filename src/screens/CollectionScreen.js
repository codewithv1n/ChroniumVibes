/**
 * VinVibes — Collection pages
 *
 * One screen for every list of songs: album, artist, playlist, folder,
 * favorites, mixes and smart lists (recently added / played, most
 * played, all songs).
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../styles/theme';
import { useStore } from '../core/store';
import { pluralize, formatTotalDuration } from '../core/format';
import { showToast } from '../core/toast';
import { sortAlbumTracks, sortTracks } from '../core/sorting';
import { libraryStore, prettyFolderPath, UNKNOWN_ALBUM } from '../services/libraryService';
import {
  statsStore,
  favoritesStore,
  playlistsStore,
  getFavoriteIds,
  renamePlaylist,
  deletePlaylist,
  moveTrackInPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} from '../services/userDataService';
import * as Rec from '../services/recommendations';
import { playTracks } from '../player/playerService';
import { goBack, navigate, openSheet } from '../navigation/navigation';
import ScreenHeader from '../components/ScreenHeader';
import CollectionHeader from '../components/CollectionHeader';
import SongList from '../components/SongList';
import Artwork, { CollageArtwork } from '../components/Artwork';
import { AlbumCard } from '../components/Cards';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import SectionHeader from '../components/SectionHeader';
import AddSongsModal from '../components/AddSongsModal';

const SMART_LISTS = {
  favorites: { title: 'Favorites', icon: 'heart', empty: ['heart-outline', 'No favorites yet', 'Songs you like will appear here.'] },
  recentlyAdded: { title: 'Recently added', icon: 'time', empty: ['time-outline', 'Nothing here yet', 'Songs recently added to this device will appear here.'] },
  mostPlayed: { title: 'Most played', icon: 'stats-chart', empty: ['stats-chart-outline', 'No plays yet', 'Your most played songs will appear here.'] },
  recentlyPlayed: { title: 'Recently played', icon: 'play-back', empty: ['play-back-outline', 'Nothing played yet', 'Songs you play will appear here.'] },
  allSongs: { title: 'All songs', icon: 'musical-notes', empty: ['musical-notes-outline', 'No music found', 'No music was found on this device.'] },
};

function useArtSize() {
  const { width } = useWindowDimensions();
  return Math.min(width * 0.62, 280);
}

function totalDuration(tracks) {
  return tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
}

function playAll(tracks, shuffle = false) {
  if (tracks.length === 0) return;
  const ids = tracks.map(t => t.id);
  playTracks(ids, shuffle ? Math.floor(Math.random() * ids.length) : 0, { shuffle });
}

// ── Album ─────────────────────────────────────────────────────

export function AlbumScreen({ albumId }) {
  const album = useStore(libraryStore, s => s.albums.find(a => a.id === albumId));
  const byId = useStore(libraryStore, s => s.byId);
  const size = useArtSize();
  const tracks = useMemo(
    () => (album ? sortAlbumTracks(album.trackIds.map(id => byId.get(id)).filter(Boolean)) : []),
    [album, byId]
  );

  if (!album) return <Missing title="Album" />;

  const meta = [album.year || null, pluralize(tracks.length, 'song'), formatTotalDuration(totalDuration(tracks))]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.flex}>
      <ScreenHeader title="" transparent />
      <SongList
        tracks={tracks}
        showIndex={album.name !== UNKNOWN_ALBUM}
        header={
          <CollectionHeader
            seed={album.name}
            artwork={<Artwork uri={album.artwork} seed={album.name} size={size} radius={RADIUS.md} icon="disc" />}
            title={album.name}
            subtitle={album.artist}
            meta={`Album · ${meta}`}
            onPlay={() => playAll(tracks)}
            onShuffle={() => playAll(tracks, true)}
          />
        }
      />
    </View>
  );
}

// ── Artist ────────────────────────────────────────────────────

export function ArtistScreen({ artistId }) {
  const artist = useStore(libraryStore, s => s.artists.find(a => a.id === artistId));
  const albums = useStore(libraryStore, s => s.albums);
  const byId = useStore(libraryStore, s => s.byId);
  const stats = useStore(statsStore, s => s.stats);
  const size = useArtSize();

  const tracks = useMemo(
    () => (artist ? sortTracks(artist.trackIds.map(id => byId.get(id)).filter(Boolean), { key: 'plays', ascending: false }, stats) : []),
    // Sorted once per visit; avoid reshuffling while songs play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artist, byId]
  );
  const artistAlbums = useMemo(
    () => (artist ? albums.filter(a => artist.albumIds.includes(a.id) && a.name !== UNKNOWN_ALBUM) : []),
    [artist, albums]
  );

  if (!artist) return <Missing title="Artist" />;

  return (
    <View style={styles.flex}>
      <ScreenHeader title="" transparent />
      <SongList
        tracks={tracks}
        header={
          <View>
            <CollectionHeader
              seed={artist.name}
              artwork={<Artwork uri={artist.artwork} seed={artist.name} size={size * 0.85} round icon="person" />}
              title={artist.name}
              meta={`${pluralize(tracks.length, 'song')} · ${pluralize(artist.albumIds.length, 'album')}`}
              onPlay={() => playAll(tracks)}
              onShuffle={() => playAll(tracks, true)}
            />
            {artistAlbums.length > 0 && (
              <View style={styles.artistAlbums}>
                <SectionHeader title="Albums" />
                <FlatList
                  horizontal
                  data={artistAlbums}
                  keyExtractor={a => a.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hRow}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  renderItem={({ item }) => <AlbumCard album={item} onPress={a => navigate('album', { albumId: a.id })} />}
                />
              </View>
            )}
            <SectionHeader title="Songs" style={styles.songsHeader} />
          </View>
        }
      />
    </View>
  );
}

// ── Playlist ──────────────────────────────────────────────────

export function PlaylistScreen({ playlistId, openAddSongs = false }) {
  const playlist = useStore(playlistsStore, s => s.playlists.find(p => p.id === playlistId));
  const byId = useStore(libraryStore, s => s.byId);
  const size = useArtSize();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (openAddSongs) setAdding(true);
  }, [openAddSongs]);

  // Map playlist entries to library tracks; remember each one's position
  // in the stored playlist so reordering works even if some files vanished.
  const entries = useMemo(() => {
    if (!playlist) return [];
    const out = [];
    playlist.tracks.forEach((t, storedIndex) => {
      const track = byId.get(t.id);
      if (track) out.push({ track, storedIndex });
    });
    return out;
  }, [playlist, byId]);
  const tracks = useMemo(() => entries.map(e => e.track), [entries]);

  const renderRight = useCallback((track, index) => {
    if (!editing) return undefined;
    const move = (to) => {
      const target = entries[to];
      if (target) moveTrackInPlaylist(playlistId, entries[index].storedIndex, target.storedIndex);
    };
    return (
      <View style={styles.reorder}>
        <IconButton icon="chevron-up" size={20} color={COLORS.textSecondary} onPress={() => move(index - 1)} disabled={index === 0} label={`Move ${track.title} up`} />
        <IconButton icon="chevron-down" size={20} color={COLORS.textSecondary} onPress={() => move(index + 1)} disabled={index === entries.length - 1} label={`Move ${track.title} down`} />
      </View>
    );
  }, [editing, entries, playlistId]);

  if (!playlist) return <Missing title="Playlist" />;

  const missing = playlist.tracks.length - tracks.length;
  const meta = [pluralize(tracks.length, 'song'), formatTotalDuration(totalDuration(tracks)), missing ? `${missing} unavailable` : null]
    .filter(Boolean)
    .join(' · ');

  const rename = () => openSheet('prompt', {
    title: 'Rename playlist',
    initialValue: playlist.name,
    onSubmit: async (name) => {
      await renamePlaylist(playlist.id, name);
      showToast('Playlist renamed');
    },
  });

  const remove = () => openSheet('confirm', {
    title: `Delete "${playlist.name}"?`,
    message: 'The playlist will be removed. Your music files stay on your device.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => {
      goBack();
      await deletePlaylist(playlist.id);
      showToast('Playlist deleted');
    },
  });

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title=""
        transparent
        right={tracks.length > 1 ? (
          <IconButton
            icon={editing ? 'checkmark' : 'swap-vertical'}
            size={22}
            color={editing ? COLORS.accentLight : COLORS.textPrimary}
            onPress={() => setEditing(e => !e)}
            label={editing ? 'Done reordering' : 'Reorder songs'}
          />
        ) : null}
      />
      <SongList
        tracks={tracks}
        context={{ playlistId }}
        renderRight={editing ? renderRight : undefined}
        header={
          <CollectionHeader
            seed={playlist.name}
            artwork={<CollageArtwork uris={tracks.slice(0, 12).map(t => t.artwork)} seed={playlist.name} size={size} radius={RADIUS.md} />}
            title={playlist.name}
            meta={`Playlist · ${meta}`}
            onPlay={tracks.length ? () => playAll(tracks) : undefined}
            onShuffle={tracks.length ? () => playAll(tracks, true) : undefined}
            actions={[
              { icon: 'add-circle-outline', label: 'Add songs', onPress: () => setAdding(true) },
              { icon: 'create-outline', label: 'Rename playlist', onPress: rename },
              { icon: 'trash-outline', label: 'Delete playlist', onPress: remove },
            ]}
          />
        }
        empty={
          <EmptyState
            compact
            icon="add-circle-outline"
            title="Let's build your playlist"
            message="Add songs from your device to this playlist."
            actionLabel="Add songs"
            onAction={() => setAdding(true)}
          />
        }
      />
      <AddSongsModal
        visible={adding}
        title="Add to playlist"
        subtitle={`${playlist.name} · ${pluralize(playlist.tracks.length, 'song')}`}
        selectedIds={new Set(playlist.tracks.map(t => t.id))}
        onToggle={(track, added) => (added ? removeTrackFromPlaylist(playlistId, track.id) : addTrackToPlaylist(playlistId, track))}
        onClose={() => setAdding(false)}
      />
    </View>
  );
}

// ── Folder, mixes and smart lists ─────────────────────────────

export function ListScreen({ kind, folderId, mix }) {
  const tracksAll = useStore(libraryStore, s => s.tracks);
  const byId = useStore(libraryStore, s => s.byId);
  const folders = useStore(libraryStore, s => s.folders);
  const favorites = useStore(favoritesStore, s => s.favorites);
  const stats = useStore(statsStore, s => s.stats);
  const size = useArtSize();

  // Stat-based lists are captured when the screen opens so the order
  // doesn't jump while the user is listening.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statsSnapshot = useMemo(() => stats, [kind, tracksAll]);

  const { title, tracks, artwork, meta, emptyInfo, icon } = useMemo(() => {
    if (kind === 'folder') {
      const folder = folders.find(f => f.id === folderId);
      const list = folder ? sortTracks(folder.trackIds.map(id => byId.get(id)).filter(Boolean), { key: 'title', ascending: true }) : [];
      return {
        title: folder?.name || 'Folder',
        tracks: list,
        meta: folder ? prettyFolderPath(folder.path) : '',
        icon: 'folder',
        emptyInfo: ['folder-open-outline', 'Empty folder', 'This folder has no songs in your library.'],
      };
    }
    if (kind === 'mix') {
      return {
        title: mix?.name || 'Mix',
        tracks: (mix?.trackIds || []).map(id => byId.get(id)).filter(Boolean),
        artwork: mix?.artwork,
        meta: 'Made from your library',
        icon: 'radio',
        emptyInfo: ['radio-outline', 'Empty mix', 'Play more music to build mixes.'],
      };
    }
    const info = SMART_LISTS[kind] || SMART_LISTS.allSongs;
    let list;
    switch (kind) {
      case 'favorites': list = getFavoriteIds(favorites).map(id => byId.get(id)).filter(Boolean); break;
      case 'recentlyAdded': list = Rec.recentlyAdded(tracksAll, 100); break;
      case 'mostPlayed': list = Rec.mostPlayed(tracksAll, statsSnapshot, 100); break;
      case 'recentlyPlayed': list = Rec.recentlyPlayed(tracksAll, statsSnapshot, 100); break;
      default: list = sortTracks(tracksAll, { key: 'title', ascending: true });
    }
    return { title: info.title, tracks: list, icon: info.icon, emptyInfo: info.empty };
  }, [kind, folderId, mix, folders, byId, favorites, tracksAll, statsSnapshot]);

  const cover = artwork !== undefined
    ? <Artwork uri={artwork} seed={title} size={size} radius={RADIUS.md} icon={icon} />
    : <CollageArtwork uris={tracks.slice(0, 12).map(t => t.artwork)} seed={title} size={size} radius={RADIUS.md} />;

  return (
    <View style={styles.flex}>
      <ScreenHeader title="" transparent />
      <SongList
        tracks={tracks}
        header={
          <CollectionHeader
            seed={title}
            artwork={tracks.length ? cover : <Artwork seed={title} size={size * 0.6} radius={RADIUS.md} icon={icon} />}
            title={title}
            meta={[meta, tracks.length ? `${pluralize(tracks.length, 'song')} · ${formatTotalDuration(totalDuration(tracks))}` : null].filter(Boolean).join(' · ')}
            onPlay={tracks.length ? () => playAll(tracks) : undefined}
            onShuffle={tracks.length ? () => playAll(tracks, true) : undefined}
          />
        }
        empty={<EmptyState compact icon={emptyInfo[0]} title={emptyInfo[1]} message={emptyInfo[2]} />}
      />
    </View>
  );
}

function Missing({ title }) {
  return (
    <View style={styles.flex}>
      <ScreenHeader title={title} />
      <EmptyState icon="alert-circle-outline" title={`${title} not found`} message="It may have been removed from your device or library." />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  artistAlbums: {
    marginTop: SPACING.md,
  },
  hRow: {
    paddingHorizontal: SPACING.md,
  },
  songsHeader: {
    marginTop: SPACING.lg,
  },
  reorder: {
    flexDirection: 'row',
  },
});
