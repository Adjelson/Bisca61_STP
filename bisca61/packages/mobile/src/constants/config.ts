// ── App identity ──────────────────────────────────────────────────────────────
export const APP_NAME    = 'Bisca 61'
export const APP_AUTHOR  = 'Adjelson Neves'
export const COPYRIGHT   = '© 2024–2026 Adjelson Neves'
export const APP_TAGLINE = 'Nova Manilha · Multijogador'

// ── Server URLs ───────────────────────────────────────────────────────────────
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.178.40:3001'
export const WS_URL  = process.env.EXPO_PUBLIC_WS_URL  ?? 'http://192.168.178.40:3001'

// ── Suits ─────────────────────────────────────────────────────────────────────
export const SUIT_LABELS: Record<string, string> = {
  E: 'Espadas', C: 'Copas', O: 'Ouros', P: 'Paus',
}

export const SUIT_SYMBOLS: Record<string, string> = {
  E: '♠', C: '♥', O: '♦', P: '♣',
}

export const SUIT_COLORS: Record<string, string> = {
  C: '#DC2626', O: '#DC2626',
  E: '#111827', P: '#111827',
}

// ── Design tokens ─────────────────────────────────────────────────────────────
export const THEME = {
  // Backgrounds
  bg:        '#FFFFFF',
  surface:   '#F8FAFC',
  surfaceAlt:'#F1F5F9',

  // Brand
  green:     '#059669',
  greenL:    '#D1FAE5',
  greenD:    '#047857',
  gold:      '#D97706',
  goldL:     '#FEF3C7',
  blue:      '#3B82F6',
  blueL:     '#DBEAFE',

  // Feedback
  red:       '#DC2626',
  redL:      '#FEF2F2',

  // Borders
  border:    '#E2E8F0',
  borderFocus:'#059669',

  // Text
  text:      '#0F172A',
  textSoft:  '#475569',
  textMute:  '#94A3B8',
} as const

export const AVATAR_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#F97316', '#6366F1',
]

// ── Icons (Unicode / emoji — no external lib needed) ──────────────────────────
export const ICONS = {
  // Navigation
  back:    '←',
  forward: '→',
  close:   '✕',
  menu:    '☰',

  // Actions
  copy:    '📋',
  share:   '📤',
  refresh: '↺',
  add:     '+',
  check:   '✓',

  // Game
  game:    '🃏',
  trophy:  '🏆',
  crown:   '👑',
  players: '👥',
  player:  '👤',
  rules:   '📖',
  swap:    '⇄',

  // UI
  sound:   '🔊',
  mute:    '🔇',
  pause:   '⏸',
  play:    '▶',
  exit:    '🚪',
  online:  '●',
  offline: '●',
  warning: '⚠',
  info:    'ℹ',
  eye:     '👁',
} as const
