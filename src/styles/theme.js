import { StyleSheet } from 'react-native';
import { readJSONFile, writeJSONFile } from '../core/storage';
import { createStore } from '../core/store';

const THEME_FILE = 'theme.json';

const DARK = {
  bgDeep:      '#05070A',   
  bgPrimary:   '#0B1018',   
  bgCard:      '#101722',   
  bgCardHover: '#151E2B',   
  bgOverlay:   'rgba(11, 16, 24, 0.96)',
  scrim:       'rgba(0, 0, 0, 0.6)',


  accent:      '#1677FF',   
  accentLight: '#39A0FF',   
  accentDark:  '#0757C8',   
  accentGlow:  'rgba(22, 119, 255, 0.18)',
  accentSoft:  'rgba(22, 119, 255, 0.12)',

 
  textPrimary:   '#FFFFFF',
  textSecondary: '#A9B4C3',
  textMuted:     '#687386',

  
  progressTrack: 'rgba(255, 255, 255, 0.12)',
  progressFill:  '#1677FF',
  progressThumb: '#FFFFFF',

  
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  border:      'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  divider:     'rgba(255, 255, 255, 0.06)',
  toast:       '#1B2636',

  
  activeRow:   'rgba(22, 119, 255, 0.08)',
  danger:      '#FF5A5F',
  favorite:    '#39A0FF',
};


const LIGHT = {
  bgDeep:      '#F4F6FA',
  bgPrimary:   '#EBEFF5',
  bgCard:      '#FFFFFF',
  bgCardHover: '#E3E9F1',
  bgOverlay:   'rgba(255, 255, 255, 0.96)',
  scrim:       'rgba(5, 7, 10, 0.4)',

  accent:      '#1677FF',
  accentLight: '#0E66E0',
  accentDark:  '#0757C8',
  accentGlow:  'rgba(22, 119, 255, 0.18)',
  accentSoft:  'rgba(22, 119, 255, 0.12)',

  textPrimary:   '#05070A',
  textSecondary: '#4A5568',
  textMuted:     '#7B8698',

  progressTrack: 'rgba(5, 7, 10, 0.12)',
  progressFill:  '#1677FF',
  progressThumb: '#1677FF',

  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  border:      'rgba(5, 7, 10, 0.08)',
  borderLight: 'rgba(5, 7, 10, 0.12)',
  divider:     'rgba(5, 7, 10, 0.07)',
  toast:       '#1B2636',

  activeRow:   'rgba(22, 119, 255, 0.08)',
  danger:      '#E5484D',
  favorite:    '#0E66E0',
};


let currentMode = readJSONFile(THEME_FILE, {}).mode === 'light' ? 'light' : 'dark';
export const themeStore = createStore({ mode: currentMode });
export const COLORS = { ...(currentMode === 'light' ? LIGHT : DARK) };

const buildTypography = () => ({
  display: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  section: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
});

export const TYPOGRAPHY = buildTypography();


export function setThemeMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  Object.assign(COLORS, mode === 'light' ? LIGHT : DARK);
  Object.assign(TYPOGRAPHY, buildTypography());
  writeJSONFile(THEME_FILE, { mode });
  themeStore.setState({ mode });
}


export function themedStyles(factory) {
  const sheets = {};
  return new Proxy({}, {
    get(_, key) {
      if (!sheets[currentMode]) sheets[currentMode] = StyleSheet.create(factory());
      return sheets[currentMode][key];
    },
  });
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  round: 999,
};

export const SIZES = {
  artworkThumb: 48,
  cardWidth: 140,
  controlButton: 68,
  controlButtonSmall: 48,
  touchTarget: 44,
  tabBarHeight: 58,
  miniPlayerHeight: 62,
};


const PLACEHOLDER_TINTS = ['#0757C8', '#1E3A5F', '#123B6B', '#2A2F6B', '#0F4C5C', '#3B2C6B', '#1D4E89', '#20374F'];

export function placeholderColors(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PLACEHOLDER_TINTS.length;
  return [PLACEHOLDER_TINTS[index], index % 2 === 0 ? COLORS.bgDeep : COLORS.bgPrimary];
}
