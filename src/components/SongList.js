/**
 * VinVibes — Virtualized song list.
 *
 * Fixed row height (getItemLayout) + windowing keeps scrolling smooth
 * with thousands of songs. Tapping a song plays the whole list from it.
 */

import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import { playTracks } from '../player/playerService';
import SongTile, { SONG_TILE_HEIGHT } from './SongTile';

export const LIST_BOTTOM_PADDING = 24;

const getItemLayout = (_, index) => ({ length: SONG_TILE_HEIGHT, offset: SONG_TILE_HEIGHT * index, index });

export default function SongList({
  tracks,
  header,
  empty,
  showIndex = false,
  context,
  onPlay,
  renderRight,
  contentPaddingBottom = LIST_BOTTOM_PADDING,
  ...rest
}) {
  const handlePress = useCallback(
    (track, index) => {
      if (onPlay) onPlay(track, index);
      else playTracks(tracks.map(t => t.id), index);
    },
    [tracks, onPlay]
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <SongTile
        track={item}
        index={index}
        onPress={handlePress}
        showIndex={showIndex}
        context={context}
        right={renderRight ? renderRight(item, index) : undefined}
      />
    ),
    [handlePress, showIndex, context, renderRight]
  );

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item, index) => `${item.id}:${index}`}
      renderItem={renderItem}
      getItemLayout={header ? undefined : getItemLayout}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      initialNumToRender={14}
      maxToRenderPerBatch={16}
      windowSize={11}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      {...rest}
    />
  );
}
