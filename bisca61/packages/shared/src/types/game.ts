import type { Card, Suit } from './card'

export type GamePhase = 'waiting' | 'playing' | 'finished'

export interface TablePlay {
  userId: number
  card: Card
}

export interface TrickHistory {
  winnerUserId: number
  plays: TablePlay[]
  points: number
  prevTrumpSuit: Suit
  newTrumpSuit: Suit
}

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
  currentTurn: number  // index into playerIds
  table: TablePlay[]
  deckCount: number
  points: [number, number]
  tricks: [number, number]
  trickNumber: number
  handCounts: Record<number, number>
  hand: Card[]                          // the viewing player's own hand
  allHands: Record<number, Card[]>      // only own hand; opponents = [] (private)
  lastDrawn: Record<number, Card | null> // card each player drew this trick (brief reveal)
  lastTrick: TrickHistory | null
  winner: 0 | 1 | -1 | null
}

export interface InternalGameState extends Omit<GameState, 'hand' | 'handCounts' | 'deckCount' | 'allHands' | 'lastDrawn'> {
  lastDrawn: Record<number, Card | null>
  _deck: Card[]
  _hands: Record<number, Card[]>
}
