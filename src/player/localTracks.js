/**
 * ChroniumVibes — Local Track Scanner
 * 
 * Requests storage permissions and scans the device for audio files / MP3s.
 */

import * as MediaLibrary from 'expo-media-library';

/**
 * Scans local storage for audio files downloaded on the device.
 * 
 * @returns {Promise<{ granted: boolean, tracks: Array }>} Object with status and loaded tracks
 */
export async function scanLocalTracks() {
  try {
    // ── Step 1: Request storage / media permissions ──────────
    const permission = await MediaLibrary.requestPermissionsAsync();

    if (permission.status !== 'granted') {
      console.log('⚠️ Permission to access media library was denied.');
      return { granted: false, tracks: [] };
    }

    // ── Step 2: Query audio files from the device ───────────
    const media = await MediaLibrary.getAssetsAsync({
      mediaType: [MediaLibrary.MediaType.audio],
      first: 500,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    if (!media || !media.assets || media.assets.length === 0) {
      console.log('🎵 No local audio files found on device.');
      return { granted: true, tracks: [] };
    }

    // ── Step 3: Map assets to player format ─────────────
    const tracks = media.assets.map((asset) => {
      const titleWithoutExt = asset.filename
        ? asset.filename.replace(/\.[^/.]+$/, '')
        : 'Unknown Song';

      return {
        id: String(asset.id),
        url: asset.uri,
        title: titleWithoutExt,
        artist: 'Local Audio',
        artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
        duration: Math.round(asset.duration || 0),
      };
    });

    console.log(`✅ Successfully loaded ${tracks.length} local track(s).`);
    return { granted: true, tracks };
  } catch (error) {
    console.error('❌ Error scanning local tracks:', error);
    return { granted: false, tracks: [] };
  }
}
