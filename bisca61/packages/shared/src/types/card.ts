export const SUITS = ['E', 'C', 'O', 'P'] as const
export const RANKS = ['A', '5', 'K', 'J', 'Q', '6', '7', '4', '3', '2'] as const

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]

export interface Card {
  s: Suit
  r: Rank
}

export const CARD_POINTS: Record<Rank, number> = {
  A: 11, '5': 10, K: 4, J: 3, Q: 2,
  '6': 0, '7': 0, '4': 0, '3': 0, '2': 0,
}

// Naipes pretos (Espadas ♠, Paus ♣): Ás › 5 › Rei › Valete › Dama › 7 › 6 › 4 › 3 › 2
export const CARD_STRENGTH_BLACK: Record<Rank, number> = {
  A: 10, '5': 9, K: 8, J: 7, Q: 6,
  '7': 5, '6': 4, '4': 3, '3': 2, '2': 1,
}

// Naipes vermelhos (Copas ♥, Ouros ♦): Ás › 5 › Rei › Valete › Dama › 2 › 3 › 4 › 6 › 7
export const CARD_STRENGTH_RED: Record<Rank, number> = {
  A: 10, '5': 9, K: 8, J: 7, Q: 6,
  '2': 5, '3': 4, '4': 3, '6': 2, '7': 1,
}

export function cardStrength(card: Card): number {
  const isBlack = card.s === 'E' || card.s === 'P'
  return isBlack ? CARD_STRENGTH_BLACK[card.r] : CARD_STRENGTH_RED[card.r]
}

// Kept for backwards compat — use cardStrength(card) for correct per-suit comparison
export const CARD_STRENGTH = CARD_STRENGTH_BLACK
