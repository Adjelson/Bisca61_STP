export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.178.41:3001'
export const WS_URL  = process.env.EXPO_PUBLIC_WS_URL  ?? 'http://192.168.178.41:3001'

export const SUIT_LABELS: Record<string, string> = {
  E: 'Espadas', C: 'Copas', O: 'Ouros', P: 'Paus',
}

export const SUIT_SYMBOLS: Record<string, string> = {
  E: '♠', C: '♥', O: '♦', P: '♣',
}

export const SUIT_COLORS: Record<string, string> = {
  C: '#DC2626', O: '#DC2626',   // vermelho
  E: '#111827', P: '#111827',   // preto
}

// Tema do redesign
export const THEME = {
  bg:       '#FFFFFF',
  surface:  '#F8FAFC',
  border:   '#E2E8F0',
  green:    '#059669',
  greenL:   '#D1FAE5',
  gold:     '#F59E0B',
  goldL:    '#FEF3C7',
  red:      '#DC2626',
  text:     '#111827',
  textSoft: '#6B7280',
  textMute: '#9CA3AF',
} as const

export const AVATAR_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
]
