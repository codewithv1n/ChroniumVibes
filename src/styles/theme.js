/**
 * ChroniumVibes — Design System
 * 
 * A premium monochrome black & white palette,
 * consistent typography scale, and spacing tokens.
 */

export const COLORS = {
  // ── Background Layers ──────────────────────────────
  bgDeep:      '#000000',    // Pure black (deepest layer)
  bgPrimary:   '#0A0A0A',    // Main screen background
  bgCard:      '#141414',    // Card / surface
  bgCardHover: '#1E1E1E',    // Elevated card state
  bgOverlay:   'rgba(20, 20, 20, 0.92)', // Glassmorphism overlay

  // ── Accent Colors (Monochrome) ─────────────────────
  accent:       '#FFFFFF',   // White as primary accent
  accentLight:  '#E0E0E0',   // Lighter variant
  accentDark:   '#888888',   // Darker variant for pressed states
  accentGlow:   'rgba(255, 255, 255, 0.08)', // Subtle glow

  // ── Text Colors ───────────────────────────────────
  textPrimary:   '#FFFFFF',  // Main text (titles)
  textSecondary: '#888888',  // Subtitles, artist names
  textMuted:     '#555555',  // Time codes, labels

  // ── Progress Bar ──────────────────────────────────
  progressTrack:  '#2A2A2A',  // Slider track background
  progressFill:   '#FFFFFF',  // Filled portion of slider
  progressThumb:  '#FFFFFF',  // Slider thumb/knob

  // ── Utility ───────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  border:      'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  divider:     'rgba(255, 255, 255, 0.05)',

  // ── State Colors ──────────────────────────────────
  activeRow:   'rgba(255, 255, 255, 0.06)',
  danger:      '#FF4444',
};

export const GRADIENTS = {
  // Background gradient (top to bottom)
  screenBg: ['#000000', '#0A0A0A', '#050505'],
  // Card glow
  cardGlow: ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0)'],
  // Player controls backdrop
  controlsBg: ['transparent', 'rgba(0, 0, 0, 0.95)'],
};

export const TYPOGRAPHY = {
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: '#888888',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    color: '#555555',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    color: '#CCCCCC',
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
  artworkLarge: 280,         // Album art on now-playing screen
  artworkMedium: 48,         // Album art in playlist row
  controlButton: 64,         // Play/Pause button diameter
  controlButtonSmall: 44,    // Skip buttons diameter
  borderRadius: 12,
  borderRadiusSmall: 8,
  borderRadiusRound: 999,
  tabBarHeight: 60,
  miniPlayerHeight: 64,
};
