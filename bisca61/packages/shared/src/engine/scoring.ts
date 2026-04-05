import { CARD_POINTS } from '../types/card'
import type { Card } from '../types/card'
import type { TablePlay } from '../types/game'

export function cardPoints(card: Card): number {
  return CARD_POINTS[card.r]
}

export function trickPoints(plays: TablePlay[]): number {
  return plays.reduce((total, play) => total + cardPoints(play.card), 0)
}

export function teamOfPlayer(teams: [number[], number[]], userId: number): 0 | 1 {
  if (teams[0].includes(userId)) return 0
  if (teams[1].includes(userId)) return 1
  // fallback: shouldn't happen in valid game
  return 0
}
