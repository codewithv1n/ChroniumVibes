/**
 * ChroniumVibes — Design System
 * 
 * A premium dark-mode color palette with vibrant accents,
 * consistent typography scale, and spacing tokens.
 */

export const COLORS = {
  // ── Background Layers ──────────────────────────────
  bgDeep:      '#06060b',    // Deepest layer (behind everything)
  bgPrimary:   '#0a0a14',    // Main screen background
  bgCard:      '#12121e',    // Card / glass surface
  bgCardHover: '#1a1a2e',    // Elevated card state
  bgOverlay:   'rgba(18, 18, 30, 0.85)', // Glassmorphism overlay

  // ── Accent Colors ─────────────────────────────────
  accent:       '#7C4DFF',   // Electric purple (primary CTA)
  accentLight:  '#B388FF',   // Lighter variant for gradients
  accentDark:   '#4A148C',   // Darker variant for pressed states
  accentGlow:   'rgba(124, 77, 255, 0.35)', // Glow/shadow

  // ── Secondary Accents ─────────────────────────────
  pink:      '#FF4081',
  cyan:      '#00E5FF',
  amber:     '#FFD740',

  // ── Text Colors ───────────────────────────────────
  textPrimary:   '#EAEAF5',  // Main text (titles)
  textSecondary: '#9595B0',  // Subtitles, artist names
  textMuted:     '#5A5A75',  // Time codes, labels

  // ── Progress Bar ──────────────────────────────────
  progressTrack:  '#2A2A40',  // Slider track background
  progressFill:   '#7C4DFF',  // Filled portion of slider
  progressThumb:  '#B388FF',  // Slider thumb/knob

  // ── Utility ───────────────────────────────────────
  white:       '#FFFFFF',
  transparent: 'transparent',
  border:      'rgba(255, 255, 255, 0.06)',
};

export const GRADIENTS = {
  // Background gradient (top to bottom)
  screenBg: ['#06060b', '#0a0a14', '#0f0f1a'],
  // Accent card glow
  cardGlow: ['rgba(124, 77, 255, 0.12)', 'rgba(124, 77, 255, 0)'],
  // Player controls backdrop
  controlsBg: ['transparent', 'rgba(6, 6, 11, 0.9)'],
};

export const TYPOGRAPHY = {
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
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

export const SIZES = {
  artworkLarge: 300,       // Album art on now-playing screen
  artworkMedium: 64,       // Album art in playlist row
  controlButton: 64,       // Play/Pause button diameter
  controlButtonSmall: 48,  // Skip buttons diameter
  borderRadius: 16,
  borderRadiusSmall: 8,
  borderRadiusRound: 999,
};
