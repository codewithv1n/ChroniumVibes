/**
 * VinVibes — Library
 *
 * Songs · Albums · Artists · Playlists · Folders, plus shortcuts to
 * Favorites, Recently added and Most played. Songs can be sorted;
 * albums and artists switch between grid and list.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { pluralize, formatTotalDuration } from '../core/format';
import { sortTracks, SONG_SORT_OPTIONS } from '../core/sorting';
import { libraryStore, prettyFolderPath } from '../services/libraryService';
import { statsStore, settingsStore, playlistsStore, updateSettings, createPlaylist } from '../services/userDataService';
import { playTracks } from '../player/playerService';
import { navigate, openSheet, libraryViewStore } from '../navigation/navigation';
import { showToast } from '../core/toast';
import SongList from '../components/SongList';
import Artwork, { CollageArtwork } from '../components/Artwork';
import { AlbumCard, ArtistCard } from '../components/Cards';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';

const VIEWS = [
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'folders', label: 'Folders' },
];

const SHORTCUTS = [
  { kind: 'favorites', label: 'Favorites', icon: 'heart' },
  { kind: 'recentlyAdded', label: 'Recently added', icon: 'time' },
  { kind: 'mostPlayed', label: 'Most played', icon: 'stats-chart' },
  { kind: 'recentlyPlayed', label: 'Recently played', icon: 'play-back' },
];

function Chip({ label, active, onPress, icon }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? COLORS.white : COLORS.accentLight} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ListRow({ artwork, title, subtitle, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label || title}
      android_ripple={{ color: COLORS.accentSoft }}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      {artwork}
      <View style={styles.listText}>
        <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.listSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

function SongsView() {
  const tracks = useStore(libraryStore, s => s.tracks);
  const stats = useStore(statsStore, s => s.stats);
  const sort = useStore(settingsStore, s => s.songSort);
  // Re-sorting by play stats while music plays would make the list jump;
  // only stat-based sorts depend on stats.
  const statsForSort = sort.key === 'plays' || sort.key === 'lastPlayed' ? stats : null;
  const sorted = useMemo(() => sortTracks(tracks, sort, statsForSort || {}), [tracks, sort, statsForSort]);
  const sortLabel = SONG_SORT_OPTIONS.find(o => o.key === sort.key)?.label || 'Title';

  const header = (
    <View style={styles.toolbar}>
      <Pressable
        onPress={() => openSheet('sort', { options: SONG_SORT_OPTIONS, value: sort, onChange: songSort => updateSettings({ songSort }) })}
        style={styles.sortButton}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${sortLabel}, ${sort.ascending ? 'ascending' : 'descending'}`}
      >
        <Ionicons name={sort.ascending ? 'arrow-up' : 'arrow-down'} size={15} color={COLORS.accentLight} />
        <Text style={styles.sortText}>{sortLabel}</Text>
      </Pressable>
      <Text style={styles.countText}>{pluralize(sorted.length, 'song')}</Text>
      <IconButton
        icon="shuffle"
        size={22}
        color={COLORS.accentLight}
        onPress={() => playTracks(sorted.map(t => t.id), Math.floor(Math.random() * sorted.length), { shuffle: true })}
        label="Shuffle all songs"
        disabled={sorted.length === 0}
      />
    </View>
  );

  return (
    <SongList
      tracks={sorted}
      header={header}
      empty={<EmptyState icon="musical-notes-outline" title="No music found" message="No music was found on this device." />}
    />
  );
}

function GridOrList({ items, renderCard, renderRow, empty }) {
  const grid = useStore(settingsStore, s => s.libraryGrid);
  const { width } = useWindowDimensions();
  const columns = width >= 600 ? 4 : 2;
  const cardWidth = (width - SPACING.md * 2 - SPACING.md * (columns - 1)) / columns;

  const header = (
    <View style={styles.toolbar}>
      <Text style={[styles.countText, styles.countLeft]}>{pluralize(items.length, 'item')}</Text>
      <IconButton
        icon={grid ? 'list' : 'grid-outline'}
        size={20}
        color={COLORS.textSecondary}
        onPress={() => updateSettings({ libraryGrid: !grid })}
        label={grid ? 'Show as list' : 'Show as grid'}
      />
    </View>
  );

  return (
    <FlatList
      key={grid ? `grid-${columns}` : 'list'}
      data={items}
      numColumns={grid ? columns : 1}
      keyExtractor={item => item.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      columnWrapperStyle={grid ? styles.gridRow : undefined}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (grid ? renderCard(item, cardWidth) : renderRow(item))}
      initialNumToRender={12}
      windowSize={9}
      removeClippedSubviews
    />
  );
}

function PlaylistsView() {
  const playlists = useStore(playlistsStore, s => s.playlists);
  const byId = useStore(libraryStore, s => s.byId);

  const create = () => openSheet('prompt', {
    title: 'New playlist',
    placeholder: 'Playlist name',
    confirmLabel: 'Create',
    onSubmit: async (name) => {
      const playlist = await createPlaylist(name);
      showToast(`Created "${playlist.name}"`);
      navigate('playlist', { playlistId: playlist.id, openAddSongs: true });
    },
  });

  return (
    <FlatList
      data={playlists}
      keyExtractor={p => p.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <Pressable onPress={create} style={({ pressed }) => [styles.listRow, pressed && styles.pressed]} accessibilityRole="button">
          <View style={styles.createIcon}>
            <Ionicons name="add" size={28} color={COLORS.white} />
          </View>
          <Text style={styles.listTitle}>Create playlist</Text>
        </Pressable>
      }
      ListEmptyComponent={
        <EmptyState compact icon="list-outline" title="No playlists yet" message="Create a playlist to organize your favorite tracks." />
      }
      renderItem={({ item }) => {
        const duration = item.tracks.reduce((sum, t) => sum + (byId.get(t.id)?.duration || 0), 0);
        return (
          <ListRow
            artwork={<CollageArtwork uris={item.tracks.slice(0, 8).map(t => byId.get(t.id)?.artwork)} seed={item.name} size={56} />}
            title={item.name}
            subtitle={`${pluralize(item.tracks.length, 'song')} · ${formatTotalDuration(duration)}`}
            onPress={() => navigate('playlist', { playlistId: item.id })}
            label={`Playlist ${item.name}`}
          />
        );
      }}
    />
  );
}

function FoldersView() {
  const folders = useStore(libraryStore, s => s.folders);
  const visible = folders.filter(f => !f.excluded);
  const hidden = folders.length - visible.length;
  return (
    <FlatList
      data={visible}
      keyExtractor={f => f.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.toolbar}>
          <Text style={[styles.countText, styles.countLeft]}>
            {pluralize(visible.length, 'folder')}{hidden ? ` · ${hidden} hidden` : ''}
          </Text>
          <Pressable onPress={() => navigate('folders')} hitSlop={10} accessibilityRole="button">
            <Text style={styles.linkText}>Manage</Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={<EmptyState compact icon="folder-open-outline" title="No folders" message="Folders with music will appear here." />}
      renderItem={({ item }) => (
        <ListRow
          artwork={<View style={styles.folderIcon}><Ionicons name="folder" size={24} color={COLORS.accentLight} /></View>}
          title={item.name}
          subtitle={`${pluralize(item.trackIds.length, 'song')} · ${prettyFolderPath(item.path)}`}
          onPress={() => navigate('collection', { kind: 'folder', folderId: item.id })}
          label={`Folder ${item.name}`}
        />
      )}
    />
  );
}

export default function LibraryScreen() {
  const view = useStore(libraryViewStore, s => s.view);
  const albums = useStore(libraryStore, s => s.albums);
  const artists = useStore(libraryStore, s => s.artists);
  const setView = useCallback(v => libraryViewStore.setState({ view: v }), []);

  let content;
  if (view === 'albums') {
    content = (
      <GridOrList
        items={albums}
        empty={<EmptyState compact icon="disc-outline" title="No albums" message="Albums are created from your songs' tags." />}
        renderCard={(album, width) => (
          <View style={{ width, marginBottom: SPACING.lg }}>
            <AlbumCard album={album} width={width} onPress={a => navigate('album', { albumId: a.id })} />
          </View>
        )}
        renderRow={album => (
          <ListRow
            artwork={<Artwork uri={album.artwork} seed={album.name} size={56} icon="disc" />}
            title={album.name}
            subtitle={`${album.artist} · ${pluralize(album.trackIds.length, 'song')}`}
            onPress={() => navigate('album', { albumId: album.id })}
            label={`Album ${album.name}`}
          />
        )}
      />
    );
  } else if (view === 'artists') {
    content = (
      <GridOrList
        items={artists}
        empty={<EmptyState compact icon="person-outline" title="No artists" message="Artists are created from your songs' tags." />}
        renderCard={(artist, width) => (
          <View style={{ width, marginBottom: SPACING.lg, alignItems: 'center' }}>
            <ArtistCard artist={artist} width={width - 12} onPress={a => navigate('artist', { artistId: a.id })} />
          </View>
        )}
        renderRow={artist => (
          <ListRow
            artwork={<Artwork uri={artist.artwork} seed={artist.name} size={56} round icon="person" />}
            title={artist.name}
            subtitle={`${pluralize(artist.albumIds.length, 'album')} · ${pluralize(artist.trackIds.length, 'song')}`}
            onPress={() => navigate('artist', { artistId: artist.id })}
            label={`Artist ${artist.name}`}
          />
        )}
      />
    );
  } else if (view === 'playlists') {
    content = <PlaylistsView />;
  } else if (view === 'folders') {
    content = <FoldersView />;
  } else {
    content = <SongsView />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">Your Library</Text>
        <IconButton icon="settings-outline" size={22} onPress={() => navigate('settings')} label="Settings" />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {VIEWS.map(v => (
            <Chip key={v.key} label={v.label} active={view === v.key} onPress={() => setView(v.key)} />
          ))}
          <View style={styles.chipDivider} />
          {SHORTCUTS.map(s => (
            <Chip key={s.kind} label={s.label} icon={s.icon} onPress={() => navigate('collection', { kind: s.kind })} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.body}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  heading: {
    ...TYPOGRAPHY.display,
    flex: 1,
  },
  chips: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.bgCardHover,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  chipDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 2,
  },
  body: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    minHeight: 48,
    gap: SPACING.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  sortText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  countText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    textAlign: 'right',
    color: COLORS.textMuted,
  },
  countLeft: {
    textAlign: 'left',
  },
  linkText: {
    color: COLORS.accentLight,
    fontWeight: '600',
    paddingRight: SPACING.sm,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  gridRow: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    minHeight: 72,
    gap: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  listText: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    ...TYPOGRAPHY.body,
  },
  listSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  createIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
