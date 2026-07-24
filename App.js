/**
 * ChroniumVibes — Main App Component
 * 
 * Tab-based navigation: Songs (default) | Now Playing | Playlists.
 * Scans downloaded music, manages playback, and supports playlists.
 * Black & white monochrome theme.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Audio Engine & Scanner ──────────────────────────────────
import { scanLocalTracks } from './src/player/localTracks';
import {
  initAudioEngine,
  setPlaylist,
  getCurrentTrack,
  setStatusListener,
  togglePlayPause,
  skipToNext,
  skipToPrevious,
  seekTo,
  playTrackAtIndex,
  getPlaylist,
} from './src/player/soundManager';

// ── UI Components ───────────────────────────────────────────
import TrackInfo from './src/components/TrackInfo';
import ProgressBar from './src/components/ProgressBar';
import PlayerControls from './src/components/PlayerControls';
import TrackList from './src/components/TrackList';
import PlaylistManager from './src/components/PlaylistManager';
import AddToPlaylistModal from './src/components/AddToPlaylistModal';

// ── Design Tokens ───────────────────────────────────────────
import { COLORS, SPACING, SIZES } from './src/styles/theme';

const TABS = {
  SONGS: 'songs',
  PLAYING: 'playing',
  PLAYLISTS: 'playlists',
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [allTracks, setAllTracks] = useState([]);
  const [currentTrack, setCurrentTrackState] = useState(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);

  // Navigation
  const [activeTab, setActiveTab] = useState(TABS.SONGS);

  // Add to Playlist modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState(null);

  // Playlist refresh trigger
  const [playlistRefreshKey, setPlaylistRefreshKey] = useState(0);

  // ── Load local tracks from device storage ──────────────────
  const loadMusic = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await initAudioEngine();

      const { granted, tracks } = await scanLocalTracks();
      setHasPermission(granted);

      if (granted && tracks.length > 0) {
        setPlaylist(tracks);
        setAllTracks(tracks);
        setCurrentTrackState(tracks[0]);
        setDuration(tracks[0].duration || 0);

        // Register playback status updates listener
        setStatusListener(({ isPlaying, position, duration, isBuffering }) => {
          setIsPlaying(isPlaying);
          setPosition(position);
          if (duration > 0) setDuration(duration);
          setIsBuffering(isBuffering);
          setCurrentTrackState(getCurrentTrack());
        });
      } else {
        setPlaylist([]);
        setAllTracks([]);
        setCurrentTrackState(null);
      }
    } catch (err) {
      console.error('Failed to load music:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMusic();
  }, [loadMusic]);

  // ── Handle track press from list ───────────────────────────
  const handleTrackPress = useCallback(async (index) => {
    // Make sure we're playing from all tracks
    const currentPlaylist = getPlaylist();
    if (currentPlaylist !== allTracks && allTracks.length > 0) {
      setPlaylist(allTracks);
    }
    await playTrackAtIndex(index);
    setActiveTab(TABS.PLAYING);
  }, [allTracks]);

  // ── Handle add to playlist ─────────────────────────────────
  const handleAddToPlaylist = useCallback((track) => {
    setSelectedTrackForPlaylist(track);
    setModalVisible(true);
  }, []);

  // ── Handle play playlist ───────────────────────────────────
  const handlePlayPlaylist = useCallback(async (tracks) => {
    if (tracks.length === 0) return;
    setPlaylist(tracks);
    await playTrackAtIndex(0);
    setActiveTab(TABS.PLAYING);
  }, []);

  // ── Loading Screen ─────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Scanning for music...</Text>
        </View>
      </View>
    );
  }

  // ── Permission Denied or No Tracks ─────────────────────────
  if (!hasPermission || allTracks.length === 0 || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={!hasPermission ? 'folder-open-outline' : 'musical-notes-outline'}
              size={48}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {!hasPermission
              ? 'Storage Permission Needed'
              : 'No Downloaded Music Found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {!hasPermission
              ? 'ChroniumVibes needs permission to read audio files on your phone.'
              : 'Download some MP3 songs, then tap below to scan again.'}
          </Text>

          <TouchableOpacity
            style={styles.scanButton}
            onPress={loadMusic}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={COLORS.black} />
            <Text style={styles.scanButtonText}>
              {!hasPermission ? 'Grant Permission' : 'Scan Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render Active Tab Content ──────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case TABS.SONGS:
        return (
          <TrackList
            tracks={allTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onTrackPress={handleTrackPress}
            onAddToPlaylist={handleAddToPlaylist}
          />
        );

      case TABS.PLAYING:
        return (
          <View style={styles.nowPlayingContainer}>
            <View style={styles.trackSection}>
              <TrackInfo track={currentTrack} />
            </View>
            <View style={styles.controlsSection}>
              <View style={styles.controlsCard}>
                <ProgressBar
                  position={position}
                  duration={duration}
                  onSeek={seekTo}
                />
                <PlayerControls
                  isPlaying={isPlaying}
                  isBuffering={isBuffering}
                  onTogglePlayPause={togglePlayPause}
                  onSkipNext={skipToNext}
                  onSkipPrevious={skipToPrevious}
                />
              </View>
            </View>
          </View>
        );

      case TABS.PLAYLISTS:
        return (
          <PlaylistManager
            onPlayPlaylist={handlePlayPlaylist}
            onRefresh={playlistRefreshKey}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.container}>
        {/* ── App Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>CHRONIUM VIBES</Text>
          {activeTab === TABS.SONGS && (
            <Text style={styles.headerSubtitle}>
              {allTracks.length} {allTracks.length === 1 ? 'SONG' : 'SONGS'}
            </Text>
          )}
        </View>

        {/* ── Screen Content ──────────────────────────────────── */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* ── Mini Player (visible when not on Now Playing tab) ── */}
        {currentTrack && activeTab !== TABS.PLAYING && (
          <TouchableOpacity
            style={styles.miniPlayer}
            onPress={() => setActiveTab(TABS.PLAYING)}
            activeOpacity={0.8}
          >
            <View style={styles.miniPlayerIcon}>
              <Ionicons name="musical-note" size={18} color={COLORS.white} />
            </View>
            <View style={styles.miniPlayerInfo}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.miniPlayerArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                togglePlayPause();
              }}
              style={styles.miniPlayBtn}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                skipToNext();
              }}
              style={styles.miniSkipBtn}
            >
              <Ionicons name="play-skip-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Bottom Tab Bar ──────────────────────────────────── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab(TABS.SONGS)}
          >
            <Ionicons
              name={activeTab === TABS.SONGS ? 'musical-notes' : 'musical-notes-outline'}
              size={22}
              color={activeTab === TABS.SONGS ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === TABS.SONGS && styles.tabLabelActive,
            ]}>
              Songs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab(TABS.PLAYING)}
          >
            <Ionicons
              name={activeTab === TABS.PLAYING ? 'play-circle' : 'play-circle-outline'}
              size={22}
              color={activeTab === TABS.PLAYING ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === TABS.PLAYING && styles.tabLabelActive,
            ]}>
              Playing
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab(TABS.PLAYLISTS)}
          >
            <Ionicons
              name={activeTab === TABS.PLAYLISTS ? 'list' : 'list-outline'}
              size={22}
              color={activeTab === TABS.PLAYLISTS ? COLORS.white : COLORS.textMuted}
            />
            <Text style={[
              styles.tabLabel,
              activeTab === TABS.PLAYLISTS && styles.tabLabelActive,
            ]}>
              Playlists
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Add to Playlist Modal ──────────────────────────────── */}
      <AddToPlaylistModal
        visible={modalVisible}
        track={selectedTrackForPlaylist}
        onClose={() => {
          setModalVisible(false);
          setSelectedTrackForPlaylist(null);
        }}
        onAdded={() => setPlaylistRefreshKey(k => k + 1)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 4 : 4,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },

  // ── Now Playing ─────────────────────────────────────
  nowPlayingContainer: {
    flex: 1,
  },
  trackSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  controlsCard: {
    backgroundColor: COLORS.bgOverlay,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },

  // ── Mini Player ─────────────────────────────────────
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  miniPlayerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.bgCardHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerInfo: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  miniPlayerArtist: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  miniPlayBtn: {
    padding: 6,
  },
  miniSkipBtn: {
    padding: 6,
  },

  // ── Tab Bar ─────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    height: SIZES.tabBarHeight,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.white,
  },

  // ── Loading ─────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
  },
  loadingBox: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // ── Empty State ─────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    borderRadius: 30,
  },
  scanButtonText: {
    color: COLORS.black,
    fontWeight: '600',
    fontSize: 15,
  },
});
