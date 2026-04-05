// Tipos copiados de @bisca61/shared — mobile é standalone

export const SUITS = ['E', 'C', 'O', 'P'] as const
export const RANKS = ['A', '5', 'K', 'J', 'Q', '6', '7', '4', '3', '2'] as const

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]

export interface Card { s: Suit; r: Rank }

export type GamePhase = 'waiting' | 'playing' | 'finished'

export interface TablePlay { userId: number; card: Card }

export interface GameState {
  phase: GamePhase
  playerCount: 2 | 4
  playerIds: number[]
  teams: [number[], number[]]
  trumpSuit: Suit
  trumpCard: Card | null
  trumpHorizontal: Card | null
  trumpRotation: Suit[]
  trumpIdx: number
  currentTurn: number
  table: TablePlay[]
  deckCount: number
  points: [number, number]
  tricks: [number, number]
  trickNumber: number
  handCounts: Record<number, number>
  hand: Card[]
  allHands: Record<number, Card[]>
  lastDrawn: Record<number, Card | null>
  winner: 0 | 1 | -1 | null
}

export interface GameSummary {
  winnerTeam: 0 | 1 | -1
  points: [number, number]
  tricks: [number, number]
}

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface RoomPlayer {
  userId: number
  username: string
  avatar: number
  slot: number
}

export interface RoomInfo {
  code: string
  playerCount: 2 | 4
  status: RoomStatus
  players: RoomPlayer[]
  hostId: number
}

export type AckFn<T = void> = (err: string | null, data?: T) => void

export interface ClientToServerEvents {
  'room:join':  (code: string, ack: AckFn<RoomInfo>) => void
  'room:leave': (code: string) => void
  'game:start': (code: string, ack: AckFn) => void
  'game:play':  (code: string, card: Card, ack: AckFn) => void
  'game:swap7': (code: string, ack: AckFn) => void
}

export interface ServerToClientEvents {
  'room:updated':  (room: RoomInfo) => void
  'game:state':    (state: GameState) => void
  'game:ended':    (summary: GameSummary) => void
  'player:joined': (p: { userId: number; username: string; avatar: number; slot: number }) => void
  'player:left':   (userId: number) => void
  'error':         (msg: string) => void
}
