/**
 * VinVibes — AlbumCard, ArtistCard, PlaylistCard, MixCard, QuickTile
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SIZES, TYPOGRAPHY } from '../styles/theme';
import { pluralize } from '../core/format';
import Artwork, { CollageArtwork } from './Artwork';

function CardShell({ onPress, onLongPress, label, width, children }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export const AlbumCard = memo(function AlbumCard({ album, onPress, width = SIZES.cardWidth }) {
  return (
    <CardShell onPress={() => onPress(album)} label={`Album ${album.name} by ${album.artist}`} width={width}>
      <Artwork uri={album.artwork} seed={album.name} size={width} radius={RADIUS.md} icon="disc" />
      <Text style={styles.title} numberOfLines={1}>{album.name}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{album.artist}</Text>
    </CardShell>
  );
});

export const ArtistCard = memo(function ArtistCard({ artist, onPress, width = SIZES.cardWidth - 20 }) {
  return (
    <CardShell onPress={() => onPress(artist)} label={`Artist ${artist.name}`} width={width}>
      <Artwork uri={artist.artwork} seed={artist.name} size={width} round icon="person" />
      <Text style={[styles.title, styles.center]} numberOfLines={1}>{artist.name}</Text>
      <Text style={[styles.subtitle, styles.center]} numberOfLines={1}>{pluralize(artist.trackIds.length, 'song')}</Text>
    </CardShell>
  );
});

export const PlaylistCard = memo(function PlaylistCard({ playlist, coverUris, onPress, width = SIZES.cardWidth }) {
  return (
    <CardShell onPress={() => onPress(playlist)} label={`Playlist ${playlist.name}`} width={width}>
      <CollageArtwork uris={coverUris} seed={playlist.name} size={width} radius={RADIUS.md} />
      <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{pluralize(playlist.tracks.length, 'song')}</Text>
    </CardShell>
  );
});

export const MixCard = memo(function MixCard({ mix, onPress, width = SIZES.cardWidth }) {
  return (
    <CardShell onPress={() => onPress(mix)} label={mix.name} width={width}>
      <View>
        <Artwork uri={mix.artwork} seed={mix.name} size={width} radius={RADIUS.md} icon="radio" />
        <View style={[styles.mixBand, { width }]}>
          <Text style={styles.mixBandText} numberOfLines={1}>MIX</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={1}>{mix.name}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{pluralize(mix.trackIds.length, 'song')}</Text>
    </CardShell>
  );
});

/** Track card for horizontal rows (Recently played, Quick picks). */
export const TrackCard = memo(function TrackCard({ track, onPress, width = SIZES.cardWidth }) {
  return (
    <CardShell onPress={() => onPress(track)} label={`${track.title} by ${track.artist}`} width={width}>
      <Artwork uri={track.artwork} seed={track.album} size={width} radius={RADIUS.md} />
      <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{track.artist}</Text>
    </CardShell>
  );
});

/** Compact two-column shortcut tile used at the top of Home. */
export const QuickTile = memo(function QuickTile({ icon, label, onPress, artwork, seed }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
    >
      {artwork !== undefined ? (
        <Artwork uri={artwork} seed={seed || label} size={52} radius={0} icon={icon} />
      ) : (
        <View style={styles.quickIcon}>
          <Ionicons name={icon} size={22} color={COLORS.accentLight} />
        </View>
      )}
      <Text style={styles.quickLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  title: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
  },
  center: {
    textAlign: 'center',
  },
  mixBand: {
    position: 'absolute',
    bottom: 0,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(5,7,10,0.55)',
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
  },
  mixBandText: {
    ...TYPOGRAPHY.micro,
    color: COLORS.accentLight,
  },
  quickTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    overflow: 'hidden',
    gap: 10,
  },
  quickIcon: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardHover,
  },
  quickLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    paddingRight: SPACING.sm,
  },
});
