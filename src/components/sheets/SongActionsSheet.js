/**
 * VinVibes — Song context menu.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../styles/theme';
import { useStore } from '../../core/store';
import { showToast } from '../../core/toast';
import { libraryStore } from '../../services/libraryService';
import { favoritesStore, toggleFavorite, removeTrackFromPlaylist } from '../../services/userDataService';
import { playNow, playNext, addToQueue } from '../../player/playerService';
import { closeSheet, openSheet } from '../../navigation/navigation';
import BottomSheet, { SheetAction } from './BottomSheet';
import Artwork from '../Artwork';

export default function SongActionsSheet({ trackId, context = {} }) {
  const track = useStore(libraryStore, s => s.byId.get(trackId));
  const liked = useStore(favoritesStore, s => !!s.favorites[trackId]);
  if (!track) return null;

  const run = (fn) => () => {
    closeSheet();
    fn();
  };

  return (
    <BottomSheet>
      <View style={styles.header}>
        <Artwork uri={track.artwork} seed={track.album} size={52} />
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{track.artist} · {track.album}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <ScrollView>
        <SheetAction icon="play-circle-outline" label="Play now" onPress={run(() => playNow(track.id))} />
        <SheetAction icon="return-down-forward-outline" label="Play next" onPress={run(() => playNext(track.id))} />
        <SheetAction icon="list-outline" label="Add to queue" onPress={run(() => addToQueue(track.id))} />
        <SheetAction
          icon="add-circle-outline"
          label="Add to playlist"
          onPress={() => openSheet('addToPlaylist', { trackId: track.id })}
        />
        <SheetAction
          icon={liked ? 'heart' : 'heart-outline'}
          label={liked ? 'Remove from Favorites' : 'Add to Favorites'}
          active={liked}
          onPress={() => {
            const now = toggleFavorite(track.id);
            showToast(now ? 'Added to Favorites' : 'Removed from Favorites', { icon: now ? 'heart' : 'heart-dislike-outline' });
          }}
        />
        {context.playlistId ? (
          <SheetAction
            icon="remove-circle-outline"
            label="Remove from this playlist"
            onPress={run(async () => {
              await removeTrackFromPlaylist(context.playlistId, track.id);
              showToast('Removed from playlist');
            })}
          />
        ) : null}
        <SheetAction icon="information-circle-outline" label="Song information" onPress={() => openSheet('songInfo', { trackId: track.id })} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.xs,
  },
});
