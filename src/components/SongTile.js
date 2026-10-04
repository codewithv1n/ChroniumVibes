import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, themedStyles } from '../styles/theme';
import { useStore } from '../core/store';
import { formatTime } from '../core/format';
import { playerStore } from '../player/playerService';
import { favoritesStore } from '../services/userDataService';
import { openSheet, openPlayer } from '../navigation/navigation';
import Artwork from './Artwork';
import IconButton from './IconButton';
import PlayingIndicator from './PlayingIndicator';

export const SONG_TILE_HEIGHT = 64;
const ART_SIZE = 48;

function SongTile({ track, index, onPress, showIndex = false, right, context }) {
  const state = useStore(playerStore, s => (s.currentId === track.id ? (s.isPlaying ? 2 : 1) : 0));
  const liked = useStore(favoritesStore, s => !!s.favorites[track.id]);
  const isCurrent = state > 0;


  const handlePress = useCallback(() => {
    if (isCurrent) openPlayer();
    else onPress?.(track, index);
  }, [isCurrent, onPress, track, index]);
  const openActions = useCallback(() => openSheet('songActions', { trackId: track.id, context }), [track.id, context]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={openActions}
      delayLongPress={350}
      android_ripple={{ color: COLORS.accentSoft }}
      style={({ pressed }) => [styles.row, isCurrent && styles.rowActive, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}${isCurrent ? ', now playing' : ''}`}
      accessibilityHint={isCurrent ? 'Opens the player.' : 'Plays the song. Long press for more options.'}
    >
      {showIndex ? (
        <View style={styles.indexCol}>
          {isCurrent ? (
            <PlayingIndicator playing={state === 2} />
          ) : (
            <Text style={styles.index}>{(index ?? 0) + 1}</Text>
          )}
        </View>
      ) : (
        <View style={styles.artBox}>
          {/* While playing, the equalizer takes the place of the music note. */}
          <Artwork uri={track.artwork} seed={track.album} size={ART_SIZE} icon={isCurrent ? null : undefined} />
          {isCurrent ? (
            <View style={[styles.artOverlay, track.artwork && styles.artOverlayDim]}>
              <PlayingIndicator playing={state === 2} color={COLORS.white} />
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.title, isCurrent && styles.titleActive]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {right ?? <Text style={styles.duration}>{formatTime(track.duration)}</Text>}

      {/* Favorite marker only — favorite/unfavorite from the ⋮ menu or player. */}
      {liked ? (
        <Ionicons name="heart" size={15} color={COLORS.accentLight} style={styles.liked} accessibilityLabel="Favorite" />
      ) : null}

      <IconButton
        icon="ellipsis-vertical"
        size={18}
        color={COLORS.textMuted}
        onPress={openActions}
        label={`More options for ${track.title}`}
      />
    </Pressable>
  );
}

const styles = themedStyles(() => ({
  row: {
    height: SONG_TILE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    gap: 12,
  },
  rowActive: {
    backgroundColor: COLORS.activeRow,
  },
  pressed: {
    opacity: 0.85,
  },
  indexCol: {
    width: 28,
    alignItems: 'center',
  },
  index: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  artBox: {
    width: ART_SIZE,
    height: ART_SIZE,
  },
  artOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artOverlayDim: {
    backgroundColor: 'rgba(5,7,10,0.55)',
  },
  liked: {
    marginLeft: 2,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.body,
    marginBottom: 2,
  },
  titleActive: {
    color: COLORS.accentLight,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
  },
  duration: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
}));

export default memo(SongTile);
