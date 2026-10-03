/**
 * VinVibes — Settings and folder management.
 */

import React from 'react';
import { View, Text, ScrollView, Switch, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { useStore } from '../core/store';
import { showToast } from '../core/toast';
import { pluralize, formatDate } from '../core/format';
import {
  libraryStore,
  scanLibrary,
  applyLibraryFilters,
  prettyFolderPath,
} from '../services/libraryService';
import {
  settingsStore,
  updateSettings,
  toggleFolderExcluded,
  clearListeningHistory,
  resetPlayCounts,
  clearRecentSearches,
} from '../services/userDataService';
import { navigate, openSheet } from '../navigation/navigation';
import ScreenHeader from '../components/ScreenHeader';

const MIN_DURATION_STEPS = [0, 15, 30, 60];

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, description, value, onPress, right, destructive }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={[label, value, description].filter(Boolean).join(', ')}
      android_ripple={onPress ? { color: COLORS.accentSoft } : undefined}
      style={styles.row}
    >
      <Ionicons name={icon} size={20} color={destructive ? COLORS.danger : COLORS.accentLight} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} /> : null}
    </Pressable>
  );
}

function ToggleRow({ icon, label, description, settingKey }) {
  const value = useStore(settingsStore, s => s[settingKey]);
  return (
    <Row
      icon={icon}
      label={label}
      description={description}
      right={
        <Switch
          value={!!value}
          onValueChange={v => updateSettings({ [settingKey]: v })}
          trackColor={{ false: COLORS.bgCardHover, true: COLORS.accentDark }}
          thumbColor={value ? COLORS.accentLight : COLORS.textSecondary}
          accessibilityLabel={label}
        />
      }
    />
  );
}

export function SettingsScreen() {
  const status = useStore(libraryStore, s => s.status);
  const trackCount = useStore(libraryStore, s => s.tracks.length);
  const duplicates = useStore(libraryStore, s => s.duplicatesHidden);
  const lastScan = useStore(libraryStore, s => s.lastScan);
  const folders = useStore(libraryStore, s => s.folders);
  const minDuration = useStore(settingsStore, s => s.minDurationSeconds);
  const scanning = status === 'scanning' || status === 'loading';

  const runScan = async (full) => {
    showToast(full ? 'Re-reading all song details...' : 'Scanning device...', { icon: 'sync' });
    const result = await scanLibrary({ full });
    if (result) showToast(`${pluralize(result.total, 'song')} found`, { icon: 'musical-notes' });
  };

  const cycleMinDuration = () => {
    const next = MIN_DURATION_STEPS[(MIN_DURATION_STEPS.indexOf(minDuration) + 1) % MIN_DURATION_STEPS.length];
    updateSettings({ minDurationSeconds: next });
    applyLibraryFilters();
  };

  const confirm = (title, message, action, done) => openSheet('confirm', {
    title,
    message,
    confirmLabel: 'Clear',
    destructive: true,
    onConfirm: async () => {
      await action();
      showToast(done);
    },
  });

  const excludedCount = folders.filter(f => f.excluded).length;
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="APPEARANCE">
          <Row icon="contrast-outline" label="Theme" value="Dark" description="Black and blue, designed for dark rooms and OLED screens." />
          <ToggleRow icon="sparkles-outline" label="Animations" description="Equalizer bars, artwork transitions and screen motion." settingKey="animations" />
        </Section>

        <Section title="PLAYBACK">
          <ToggleRow icon="play-circle-outline" label="Resume previous playback" description="Continue from where you left off after reopening the app." settingKey="resumePlayback" />
          <ToggleRow icon="list-outline" label="Remember queue" description="Restore your queue, shuffle and repeat modes." settingKey="rememberQueue" />
          <ToggleRow icon="play-forward-outline" label="Auto-play next" description="Start the next song when one ends." settingKey="autoPlayNext" />
        </Section>

        <Section title="LIBRARY">
          <Row
            icon="sync-outline"
            label={scanning ? 'Scanning...' : 'Scan for new music'}
            description={lastScan ? `Last scan ${formatDate(lastScan)} · ${pluralize(trackCount, 'song')}` : undefined}
            onPress={scanning ? undefined : () => runScan(false)}
          />
          <Row
            icon="refresh-outline"
            label="Refresh library"
            description="Re-read titles, artists, albums and artwork from every file."
            onPress={scanning ? undefined : () => runScan(true)}
          />
          <Row
            icon="folder-outline"
            label="Included folders"
            value={excludedCount ? `${excludedCount} excluded` : 'All'}
            onPress={() => navigate('folders')}
          />
          <Row
            icon="timer-outline"
            label="Hide short audio"
            description="Skips ringtones, notification sounds and voice notes."
            value={minDuration ? `Under ${minDuration}s` : 'Off'}
            onPress={cycleMinDuration}
          />
          {duplicates > 0 ? (
            <Row icon="copy-outline" label="Duplicate files hidden" value={String(duplicates)} description="Identical copies of the same file in different folders." />
          ) : null}
        </Section>

        <Section title="DATA">
          <Row icon="time-outline" label="Clear listening history" destructive
            onPress={() => confirm('Clear listening history?', 'Recently played, play counts and listening time will be removed.', clearListeningHistory, 'Listening history cleared')} />
          <Row icon="stats-chart-outline" label="Reset play counts" destructive
            onPress={() => confirm('Reset play counts?', 'Most played and Quick picks will start fresh.', resetPlayCounts, 'Play counts reset')} />
          <Row icon="search-outline" label="Clear recent searches" destructive
            onPress={() => { clearRecentSearches(); showToast('Recent searches cleared'); }} />
        </Section>

        <Section title="ABOUT">
          <Row icon="information-circle-outline" label="Version" value={version} />
          <Row
            icon="lock-closed-outline"
            label="Privacy"
            description="VinVibes works completely offline. Your music files, playlists, favorites and listening history stay on this device and are never uploaded."
          />
        </Section>
      </ScrollView>
    </View>
  );
}

export function FoldersScreen() {
  const folders = useStore(libraryStore, s => s.folders);
  const toggle = (path) => {
    toggleFolderExcluded(path);
    applyLibraryFilters();
  };
  return (
    <View style={styles.flex}>
      <ScreenHeader title="Folders" />
      <FlatList
        data={folders}
        keyExtractor={f => f.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Text style={styles.help}>
            Turn off a folder to hide its audio from your library. Files are never deleted.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.folderRow}>
            <Ionicons name={item.excluded ? 'folder-outline' : 'folder'} size={22} color={item.excluded ? COLORS.textMuted : COLORS.accentLight} />
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, item.excluded && styles.muted]} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.rowDescription} numberOfLines={1}>
                {pluralize(item.trackIds.length, 'file')} · {prettyFolderPath(item.path)}
              </Text>
            </View>
            <Switch
              value={!item.excluded}
              onValueChange={() => toggle(item.path)}
              trackColor={{ false: COLORS.bgCardHover, true: COLORS.accentDark }}
              thumbColor={item.excluded ? COLORS.textSecondary : COLORS.accentLight}
              accessibilityLabel={`Include ${item.name}`}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.micro,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    ...TYPOGRAPHY.body,
  },
  rowDescription: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  rowValue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  destructive: {
    color: COLORS.danger,
  },
  muted: {
    color: COLORS.textMuted,
  },
  help: {
    ...TYPOGRAPHY.caption,
    marginVertical: SPACING.md,
    lineHeight: 19,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 12,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
});
