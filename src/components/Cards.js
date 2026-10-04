import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SIZES, TYPOGRAPHY, themedStyles } from '../styles/theme';
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

export const PlaylistCard = memo(function PlaylistCard({ playlist, coverUris, onPress, width = SIZES.cardWidth }) {
  return (
    <CardShell onPress={() => onPress(playlist)} label={`Playlist ${playlist.name}`} width={width}>
      <CollageArtwork uris={coverUris} seed={playlist.name} size={width} radius={RADIUS.md} />
      <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>{pluralize(playlist.tracks.length, 'song')}</Text>
    </CardShell>
  );
});

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

const styles = themedStyles(() => ({
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
}));
