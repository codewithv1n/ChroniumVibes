import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';

export const KEYS = {
  schema: '@cv/schema',
  favorites: '@cv/favorites',
  stats: '@cv/stats',
  recentSearches: '@cv/recent-searches',
  settings: '@cv/settings',
  player: '@cv/player',
  playlists: '@vinvibes_playlists',
};
const LEGACY_PLAYLISTS_KEY = '@chroniumvibes_playlists';

const SCHEMA_VERSION = 3;

const MIGRATIONS = {
  1: async () => {},
  2: async () => {
    const legacy = await AsyncStorage.getItem(LEGACY_PLAYLISTS_KEY);
    if (legacy === null) return;
    const current = await AsyncStorage.getItem(KEYS.playlists);
    if (current === null) await AsyncStorage.setItem(KEYS.playlists, legacy);
    await AsyncStorage.removeItem(LEGACY_PLAYLISTS_KEY);
  },
};

export async function runMigrations() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.schema);
    let version = raw ? Number(raw) : 1;
    while (version < SCHEMA_VERSION) {
      const migrate = MIGRATIONS[version];
      if (migrate) await migrate();
      version += 1;
    }
    await AsyncStorage.setItem(KEYS.schema, String(SCHEMA_VERSION));
  } catch (error) {
    console.error('Storage migration failed:', error);
  }
}

export async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);
    return fallback;
  }
}

export async function writeJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);
  }
}

export async function removeKeys(keys) {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to remove keys:', error);
  }
}

export function createDebouncedWriter(key, delayMs = 1500) {
  let timer = null;
  let pending;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (pending !== undefined) {
      const value = pending;
      pending = undefined;
      return writeJSON(key, value);
    }
    return Promise.resolve();
  };
  return {
    write(value) {
      pending = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}

function dataFile(name) {
  return new File(Paths.document, name);
}

export function readJSONFile(name, fallback) {
  try {
    const file = dataFile(name);
    if (!file.exists) return fallback;
    return JSON.parse(file.textSync());
  } catch (error) {
    console.error(`Failed to read ${name}:`, error);
    return fallback;
  }
}

export function writeJSONFile(name, value) {
  try {
    const file = dataFile(name);
    if (!file.exists) file.create();
    file.write(JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${name}:`, error);
  }
}

export function getArtworkDirectory() {
  const dir = new Directory(Paths.cache, 'artwork');
  try {
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  } catch (error) {
    console.error('Failed to create artwork directory:', error);
  }
  return dir;
}

export function clearArtworkDirectory() {
  try {
    const dir = new Directory(Paths.cache, 'artwork');
    if (dir.exists) dir.delete();
  } catch (error) {
    console.error('Failed to clear artwork cache:', error);
  }
}
