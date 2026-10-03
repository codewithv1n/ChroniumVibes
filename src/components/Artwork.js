/**
 * VinVibes — Artwork
 *
 * Shows embedded album art from the local cache, or a tasteful generated
 * placeholder (deterministic colors per album/artist) when none exists.
 */

import React, { memo, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, placeholderColors } from '../styles/theme';

function Artwork({ uri, seed = '', size = 48, radius = RADIUS.sm, icon = 'musical-note', round = false, style }) {
  const [failedUri, setFailedUri] = useState(null);
  const borderRadius = round ? size / 2 : radius;
  const box = { width: size, height: size, borderRadius };

  if (uri && failedUri !== uri) {
    return (
      <Image
        source={{ uri }}
        style={[box, styles.image, style]}
        resizeMode="cover"
        resizeMethod="resize"
        onError={() => setFailedUri(uri)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  const [from, to] = placeholderColors(seed);
  return (
    <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, styles.placeholder, style]}>
      <Ionicons name={icon} size={Math.max(16, size * 0.36)} color="rgba(255,255,255,0.75)" />
    </LinearGradient>
  );
}

/** 2x2 collage for playlist covers (falls back to a single tile). */
export const CollageArtwork = memo(function CollageArtwork({ uris = [], seed, size = 48, radius = RADIUS.sm, style }) {
  const unique = [...new Set(uris.filter(Boolean))];
  if (unique.length < 4) {
    return <Artwork uri={unique[0]} seed={seed} size={size} radius={radius} icon="musical-notes" style={style} />;
  }
  const half = size / 2;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, styles.collage, style]}>
      {unique.slice(0, 4).map(uri => (
        <Image key={uri} source={{ uri }} style={{ width: half, height: half }} resizeMethod="resize" />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.bgCardHover,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
    backgroundColor: COLORS.bgCardHover,
  },
});

export default memo(Artwork);
