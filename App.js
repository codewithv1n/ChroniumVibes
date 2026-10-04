import { useEffect, useRef, useCallback } from 'react';
import { View, Text, Animated, AppState, BackHandler, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SIZES, themeStore, themedStyles } from './src/styles/theme';
import { useStore } from './src/core/store';
import { runMigrations } from './src/core/storage';
import { showToast } from './src/core/toast';
import { pluralize } from './src/core/format';
import {
  libraryStore,
  loadCachedLibrary,
  scanLibrary,
  checkPermission,
  requestPermission,
  openAppSettings,
} from './src/services/libraryService';
import { initUserData, flushUserData, settingsStore } from './src/services/userDataService';
import { systemStore, refreshSystemStatus, enableNotifications } from './src/services/systemService';
import { initPlayer, restorePlaybackState, playerStore } from './src/player/playerService';
import { navStore, handleBackPress, TABS } from './src/navigation/navigation';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import { PlaylistScreen, ListScreen } from './src/screens/CollectionScreen';
import { SettingsScreen, FoldersScreen } from './src/screens/SettingsScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import MiniPlayer from './src/components/MiniPlayer';
import TabBar from './src/components/TabBar';
import Toast from './src/components/Toast';
import SheetHost from './src/components/sheets/SheetHost';
import EmptyState from './src/components/EmptyState';
import LoadingState from './src/components/LoadingState';

const ROOTS = { home: HomeScreen, search: SearchScreen, library: LibraryScreen };

const ROUTES = {
  playlist: ({ playlistId, openAddSongs }) => <PlaylistScreen playlistId={playlistId} openAddSongs={openAddSongs} />,
  collection: params => <ListScreen {...params} />,
  settings: () => <SettingsScreen />,
  folders: () => <FoldersScreen />,
};

let booted = false;

async function boot() {
  if (booted) return;
  booted = true;
  refreshSystemStatus();
  await runMigrations();
  await initUserData();
  await initPlayer();

  const cachedCount = loadCachedLibrary();
  if (cachedCount > 0) await restorePlaybackState();

  const permission = await checkPermission();
  if (permission !== 'granted' && cachedCount === 0) return; // permission screen takes over
  await runScan({ announce: cachedCount === 0 });
  if (cachedCount === 0) await restorePlaybackState();
}

async function runScan({ announce }) {
  const result = await scanLibrary();
  if (!result) return;
  if (announce && result.total > 0) {
    showToast(`${pluralize(result.total, 'song')} found`, { icon: 'musical-notes' });
  } else if (result.added > 0) {
    showToast(`${pluralize(result.added, 'new song')} added`, { icon: 'musical-notes' });
  }
}


function ScreenTransition({ children, animate }) {
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [animate, progress]);
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        {
          opacity: progress,
          transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}


function TabStacks() {
  const tab = useStore(navStore, s => s.tab);
  const stacks = useStore(navStore, s => s.stacks);
  const animationsOn = useStore(settingsStore, s => s.animations);

  return (
    <View style={styles.flex}>
      {TABS.map(name => {
        const Root = ROOTS[name];
        const stack = stacks[name];
        const tabVisible = name === tab;
        return (
          <View key={name} style={[StyleSheet.absoluteFill, !tabVisible && styles.hidden]}>
            <View style={[StyleSheet.absoluteFill, stack.length > 0 && styles.hidden]}>
              <Root />
            </View>
            {stack.map((route, i) => {
              const render = ROUTES[route.name];
              const onTop = i === stack.length - 1;
              return (
                <View key={route.key} style={[StyleSheet.absoluteFill, !onTop && styles.hidden]}>
                  <ScreenTransition animate={animationsOn}>
                    {render ? render(route.params) : null}
                  </ScreenTransition>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function NotificationScreen() {
  return (
    <View style={styles.center}>
      <EmptyState
        icon="notifications-off-outline"
        title="Turn on notifications"
        message="VinVibes needs notifications to keep music playing in the background and to show the player on your lock screen. Tap below, then allow notifications for VinVibes."
        actionLabel="Turn on notifications"
        onAction={enableNotifications}
      />
    </View>
  );
}

function PermissionScreen({ permission }) {
  if (permission === 'unsupported') {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="construct-outline"
          title="Needs an installed build"
          message="Expo Go isn't allowed to read music files on Android. Install a VinVibes build (eas build) to scan and play your songs."
        />
      </View>
    );
  }
  const blocked = permission === 'blocked';
  const onPress = async () => {
    if (blocked) {
      openAppSettings();
      return;
    }
    const result = await requestPermission();
    if (result === 'granted') {
      await runScan({ announce: true });
      await restorePlaybackState();
    }
  };
  return (
    <View style={styles.center}>
      <EmptyState
        icon="folder-open-outline"
        title={blocked ? 'Allow access in Settings' : 'Find the music on your phone'}
        message={
          blocked
            ? 'Music access was turned off for VinVibes. Open Settings › Permissions › Music and audio, then choose Allow.'
            : 'VinVibes needs permission to read the audio files saved on this device. Your music never leaves your phone.'
        }
        actionLabel={blocked ? 'Open Settings' : 'Allow access'}
        onAction={onPress}
      />
    </View>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const status = useStore(libraryStore, s => s.status);
  const permission = useStore(libraryStore, s => s.permission);
  const progress = useStore(libraryStore, s => s.progress);
  const trackCount = useStore(libraryStore, s => s.tracks.length);
  const hasAnyIndexed = useStore(libraryStore, s => s.allTracks.length > 0);
  const hasCurrent = useStore(playerStore, s => !!s.currentId);
  const themeMode = useStore(themeStore, s => s.mode);
  const notificationsEnabled = useStore(systemStore, s => s.notificationsEnabled);

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, []);

  
  const onAppStateChange = useCallback(async (state) => {
    if (state !== 'active') {
      flushUserData();
      return;
    }
    refreshSystemStatus();
    const before = libraryStore.getState().permission;
    const now = await checkPermission();
    if (now === 'granted' && before !== 'granted') {
      await runScan({ announce: true });
      await restorePlaybackState();
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [onAppStateChange]);


  let body;
  if (!notificationsEnabled) {
    body = <NotificationScreen />;
  } else if (!hasAnyIndexed && ['denied', 'blocked', 'unsupported'].includes(permission)) {
    body = <PermissionScreen permission={permission} />;
  } else if (!hasAnyIndexed && (status === 'idle' || status === 'loading')) {
    body = <LoadingState message="Scanning device..." progress={progress} />;
  } else if (status === 'error' && !hasAnyIndexed) {
    body = (
      <View style={styles.center}>
        <EmptyState icon="warning-outline" title="Couldn't read your music" message="Something went wrong while scanning. Please try again."
          actionLabel="Try again" onAction={() => runScan({ announce: true })} />
      </View>
    );
  } else if (trackCount === 0) {
    body = (
      <View style={styles.center}>
        <EmptyState
          icon="musical-notes-outline"
          title="No music found"
          message={hasAnyIndexed
            ? 'All your audio is hidden by folder or length filters. Check Settings › Library.'
            : 'No music was found on this device. Download or copy some songs, then scan again.'}
          actionLabel="Scan device"
          onAction={() => runScan({ announce: true })}
        />
      </View>
    );
  } else {
    body = <TabStacks />;
  }

  return (
    <View style={styles.app}>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        {body}
        {status === 'scanning' && progress ? (
          <View style={styles.scanBanner} pointerEvents="none">
            <Ionicons name="sync" size={14} color={COLORS.accentLight} />
            <Text style={styles.scanText}>Updating library {progress.done}/{progress.total}</Text>
          </View>
        ) : null}
      </View>
      {hasCurrent && trackCount > 0 ? <MiniPlayer /> : null}
      <TabBar />
      <Toast bottomOffset={insets.bottom + SIZES.tabBarHeight + (hasCurrent ? SIZES.miniPlayerHeight + 16 : 12)} />
      <NowPlayingScreen />
      <SheetHost />
    </View>
  );
}

export default function App() {
  const themeMode = useStore(themeStore, s => s.mode);
  return (
    <SafeAreaProvider style={styles.app}>
      <Shell key={themeMode} />
    </SafeAreaProvider>
  );
}

const styles = themedStyles(() => ({
  app: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
  },
  flex: {
    flex: 1,
  },
  screen: {
    backgroundColor: COLORS.bgDeep,
  },
  hidden: {
    display: 'none',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  scanBanner: {
    position: 'absolute',
    top: SPACING.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.bgCardHover,
  },
  scanText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
}));

