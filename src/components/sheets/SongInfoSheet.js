/**
 * VinVibes — Song Information.
 */

import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, themedStyles } from '../../styles/theme';
import { useStore } from '../../core/store';
import { formatTime, formatBytes, formatDate } from '../../core/format';
import { libraryStore, prettyFolderPath, UNKNOWN_ALBUM } from '../../services/libraryService';
import { statsStore } from '../../services/userDataService';
import { readTechnicalInfo } from '../../services/metadataReader';
import BottomSheet from './BottomSheet';
import Artwork from '../Artwork';

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} selectable>{value}</Text>
    </View>
  );
}

export default function SongInfoSheet({ trackId }) {
  const track = useStore(libraryStore, s => s.byId.get(trackId));
  const stat = useStore(statsStore, s => s.stats[trackId]);
  // Read on demand: only when the sheet is opened.
  const tech = useMemo(() => (track ? readTechnicalInfo(track.url, track.duration) : null), [track]);
  if (!track) return null;

  const bitrate = tech?.bitrate ? `${tech.isAverage ? '≈ ' : ''}${tech.bitrate} kbps` : 'Unknown';

  return (
    <BottomSheet title="Song information">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Artwork uri={track.artwork} seed={track.album} size={72} />
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={2}>{track.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{track.artist}</Text>
          </View>
        </View>
        <Row label="Title" value={track.title} />
        <Row label="Artist" value={track.artist} />
        <Row label="Album" value={track.album === UNKNOWN_ALBUM ? 'Unknown' : track.album} />
        {track.year ? <Row label="Year" value={String(track.year)} /> : null}
        {track.genre ? <Row label="Genre" value={track.genre} /> : null}
        <Row label="Duration" value={formatTime(track.duration)} />
        <Row label="Format" value={track.format || 'Unknown'} />
        <Row label="File size" value={formatBytes(tech?.size || track.size)} />
        <Row label="Bitrate" value={bitrate} />
        <Row label="File name" value={track.filename} />
        <Row label="Location" value={prettyFolderPath(track.folder)} />
        <Row label="Date added" value={formatDate(track.dateAdded)} />
        <Row label="Plays" value={String(stat?.plays || 0)} />
        <Row label="Last played" value={stat?.lastPlayed ? formatDate(stat.lastPlayed) : 'Never'} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = themedStyles(() => ({
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
    gap: SPACING.md,
  },
  label: {
    width: 96,
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  value: {
    flex: 1,
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
  },
}));
