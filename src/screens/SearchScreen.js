/**
 * VinVibes — Search
 *
 * Instant local search across songs (title, artist, album), playlists
 * and folders. Text is normalized once per library change; queries are
 * debounced so typing stays smooth with thousands of songs.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, SectionList, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { normalizeText, pluralize } from '../core/format';
import { libraryStore, prettyFolderPath } from '../services/libraryService';
import {
  playlistsStore,
  searchHistoryStore,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../services/userDataService';
import { playTracks } from '../player/playerService';
import { navigate } from '../navigation/navigation';
import SongTile from '../components/SongTile';
import { CollageArtwork } from '../components/Artwork';
import EmptyState from '../components/EmptyState';
import IconButton from '../components/IconButton';

const DEBOUNCE_MS = 150;
const LIMITS = { songs: 40, playlists: 6, folders: 6 };

/** Rank: exact > starts with > word starts with > contains. */
function score(text, query) {
  if (text === query) return 4;
  if (text.startsWith(query)) return 3;
  if (text.includes(` ${query}`)) return 2;
  if (text.includes(query)) return 1;
  return 0;
}

function ResultRow({ artwork, title, subtitle, onPress, label }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: COLORS.accentSoft }}
      style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
    >
      {artwork}
      <View style={styles.resultText}>
        <Text style={styles.resultTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </Pressable>
  );
}

export default function SearchScreen() {
  const tracks = useStore(libraryStore, s => s.tracks);
  const folders = useStore(libraryStore, s => s.folders);
  const byId = useStore(libraryStore, s => s.byId);
  const playlists = useStore(playlistsStore, s => s.playlists);
  const recent = useStore(searchHistoryStore, s => s.recent);

  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setQuery(normalizeText(input)), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [input]);

  // Normalized search keys, rebuilt only when the library changes.
  const index = useMemo(() => tracks.map(t => ({
    track: t,
    title: normalizeText(t.title),
    artist: normalizeText(t.artist),
    album: normalizeText(t.album),
  })), [tracks]);

  const results = useMemo(() => {
    if (!query) return null;
    const songs = index
      .map(e => ({ e, s: Math.max(score(e.title, query) * 3, score(e.artist, query) * 2, score(e.album, query)) }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, LIMITS.songs)
      .map(r => r.e.track);
    const match = (items, key) => items
      .map(item => ({ item, s: score(normalizeText(key(item)), query) }))
      .filter(r => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(r => r.item);

    return {
      songs,
      playlists: match(playlists, p => p.name).slice(0, LIMITS.playlists),
      folders: match(folders.filter(f => !f.excluded), f => f.name).slice(0, LIMITS.folders),
    };
  }, [query, index, playlists, folders]);

  const remember = () => addRecentSearch(input);

  const sections = useMemo(() => {
    if (!results) return [];
    const out = [];
    if (results.songs.length) out.push({ key: 'songs', title: 'Songs', data: results.songs });
    if (results.playlists.length) out.push({ key: 'playlists', title: 'Playlists', data: results.playlists });
    if (results.folders.length) out.push({ key: 'folders', title: 'Folders', data: results.folders });
    return out;
  }, [results]);

  const renderItem = ({ item, index: i, section }) => {
    switch (section.key) {
      case 'songs':
        return (
          <SongTile
            track={item}
            index={i}
            onPress={() => {
              remember();
              playTracks(results.songs.map(t => t.id), i);
            }}
          />
        );
      case 'playlists':
        return (
          <ResultRow
            label={`Playlist ${item.name}`}
            artwork={<CollageArtwork uris={item.tracks.slice(0, 8).map(t => byId.get(t.id)?.artwork)} seed={item.name} size={48} />}
            title={item.name}
            subtitle={`Playlist · ${pluralize(item.tracks.length, 'song')}`}
            onPress={() => { remember(); navigate('playlist', { playlistId: item.id }); }}
          />
        );
      default:
        return (
          <ResultRow
            label={`Folder ${item.name}`}
            artwork={<View style={styles.folderIcon}><Ionicons name="folder" size={22} color={COLORS.accentLight} /></View>}
            title={item.name}
            subtitle={prettyFolderPath(item.path)}
            onPress={() => { remember(); navigate('collection', { kind: 'folder', folderId: item.id }); }}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">Search</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Songs, artists, playlists, folders"
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
          onSubmitEditing={remember}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search your music"
        />
        {input.length > 0 && (
          <IconButton icon="close-circle" size={20} color={COLORS.textMuted} onPress={() => { setInput(''); inputRef.current?.focus(); }} label="Clear search" />
        )}
      </View>

      {!query ? (
        recent.length > 0 ? (
          <View>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent searches</Text>
              <Pressable onPress={clearRecentSearches} hitSlop={10} accessibilityRole="button">
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>
            {recent.map(item => (
              <Pressable
                key={item}
                style={styles.recentRow}
                onPress={() => { setInput(item); Keyboard.dismiss(); }}
                accessibilityRole="button"
                accessibilityLabel={`Search ${item}`}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
                <Text style={styles.recentText} numberOfLines={1}>{item}</Text>
                <IconButton icon="close" size={18} color={COLORS.textMuted} onPress={() => removeRecentSearch(item)} label={`Remove ${item}`} />
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="search"
            title="Search your library"
            message="Find any song, playlist or folder on this device."
          />
        )
      ) : sections.length === 0 ? (
        <EmptyState
          icon="sad-outline"
          title={`No results for "${input.trim()}"`}
          message="No songs, playlists, or folders matched your search."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => `${item.id}:${i}`}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          initialNumToRender={16}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heading: {
    ...TYPOGRAPHY.display,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingLeft: 14,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgCardHover,
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: 0,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  recentTitle: {
    ...TYPOGRAPHY.section,
    fontSize: 17,
  },
  clearText: {
    color: COLORS.accentLight,
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    minHeight: 48,
    gap: 12,
  },
  recentText: {
    flex: 1,
    ...TYPOGRAPHY.body,
  },
  sectionTitle: {
    ...TYPOGRAPHY.micro,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 64,
    gap: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  resultText: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    ...TYPOGRAPHY.body,
  },
  resultSubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
