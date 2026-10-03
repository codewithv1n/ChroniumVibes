/**
 * VinVibes — Design System
 *
 * Black + blue palette. Black/dark surfaces make up most of the UI;
 * blue is reserved for active states, progress, the playing track and
 * primary actions. Album artwork provides the rest of the color.
 */

export const COLORS = {
  // ── Background Layers ──────────────────────────────
  bgDeep:      '#05070A',   // App background
  bgPrimary:   '#0B1018',   // Secondary background
  bgCard:      '#101722',   // Card / surface
  bgCardHover: '#151E2B',   // Elevated surface
  bgOverlay:   'rgba(11, 16, 24, 0.96)',
  scrim:       'rgba(0, 0, 0, 0.6)',

  // ── Blue Accents ───────────────────────────────────
  accent:      '#1677FF',   // Primary blue
  accentLight: '#39A0FF',   // Bright accent blue
  accentDark:  '#0757C8',   // Deep blue
  accentGlow:  'rgba(22, 119, 255, 0.18)',
  accentSoft:  'rgba(22, 119, 255, 0.12)',

  // ── Text Colors ───────────────────────────────────
  textPrimary:   '#FFFFFF',
  textSecondary: '#A9B4C3',
  textMuted:     '#687386',

  // ── Progress Bar ──────────────────────────────────
  progressTrack: 'rgba(255, 255, 255, 0.12)',
  progressFill:  '#1677FF',
  progressThumb: '#FFFFFF',

  // ── Utility ───────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  border:      'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  divider:     'rgba(255, 255, 255, 0.06)',

  // ── State Colors ──────────────────────────────────
  activeRow:   'rgba(22, 119, 255, 0.08)',
  danger:      '#FF5A5F',
  favorite:    '#39A0FF',
};

export const TYPOGRAPHY = {
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
};

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

/**
 * Deterministic placeholder colors so the same album/artist always gets
 * the same generated artwork.
 */
const PLACEHOLDER_PALETTE = [
  ['#0757C8', '#05070A'],
  ['#1E3A5F', '#0B1018'],
  ['#123B6B', '#05070A'],
  ['#2A2F6B', '#0B1018'],
  ['#0F4C5C', '#05070A'],
  ['#3B2C6B', '#0B1018'],
  ['#1D4E89', '#05070A'],
  ['#20374F', '#0B1018'],
];

export function placeholderColors(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return PLACEHOLDER_PALETTE[Math.abs(hash) % PLACEHOLDER_PALETTE.length];
}
