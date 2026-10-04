/**
 * VinVibes — Collection pages
 *
 * One screen for every list of songs: playlist, folder, favorites,
 * and all songs.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, RADIUS, themedStyles } from '../styles/theme';
import { useStore } from '../core/store';
import { pluralize, formatTotalDuration } from '../core/format';
import { showToast } from '../core/toast';
import { sortTracks } from '../core/sorting';
import { libraryStore, prettyFolderPath } from '../services/libraryService';
import {
  favoritesStore,
  playlistsStore,
  getFavoriteIds,
  renamePlaylist,
  deletePlaylist,
  moveTrackInPlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
} from '../services/userDataService';
import { playTracks, playerStore, togglePlayPause } from '../player/playerService';
import { goBack, openSheet } from '../navigation/navigation';
import ScreenHeader from '../components/ScreenHeader';
import CollectionHeader from '../components/CollectionHeader';
import SongList from '../components/SongList';
import Artwork, { CollageArtwork } from '../components/Artwork';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';
import AddSongsModal from '../components/AddSongsModal';

const SMART_LISTS = {
  favorites: { title: 'Favorites', icon: 'heart', empty: ['heart-outline', 'No favorites yet', 'Songs you like will appear here.'] },
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

/**
 * Big play button state: this collection is "current" when the queue holds
 * exactly its songs (in any order, so shuffle counts). Then the button
 * pauses/resumes instead of restarting from the first song.
 */
function useCollectionPlayback(tracks) {
  const { queue, isPlaying } = useStore(playerStore, s => ({ queue: s.queue, isPlaying: s.isPlaying }));
  const isCurrent = useMemo(() => {
    if (tracks.length === 0 || queue.length !== tracks.length) return false;
    const ids = new Set(tracks.map(t => t.id));
    return queue.every(id => ids.has(id));
  }, [tracks, queue]);

  const onPlay = tracks.length
    ? () => (isCurrent ? togglePlayPause() : playAll(tracks))
    : undefined;
  return { onPlay, isPlaying: isCurrent && isPlaying };
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
  const playback = useCollectionPlayback(tracks);

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
            onPlay={playback.onPlay}
            isPlaying={playback.isPlaying}
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

// ── Folder, favorites and all songs ───────────────────────────

export function ListScreen({ kind, folderId }) {
  const tracksAll = useStore(libraryStore, s => s.tracks);
  const byId = useStore(libraryStore, s => s.byId);
  const folders = useStore(libraryStore, s => s.folders);
  const favorites = useStore(favoritesStore, s => s.favorites);
  const size = useArtSize();

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
    const info = SMART_LISTS[kind] || SMART_LISTS.allSongs;
    let list;
    switch (kind) {
      case 'favorites': list = getFavoriteIds(favorites).map(id => byId.get(id)).filter(Boolean); break;
      default: list = sortTracks(tracksAll, { key: 'title', ascending: true });
    }
    return { title: info.title, tracks: list, icon: info.icon, emptyInfo: info.empty };
  }, [kind, folderId, folders, byId, favorites, tracksAll]);
  const playback = useCollectionPlayback(tracks);

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
            onPlay={playback.onPlay}
            isPlaying={playback.isPlaying}
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

const styles = themedStyles(() => ({
  flex: {
    flex: 1,
  },
  reorder: {
    flexDirection: 'row',
  },
}));
