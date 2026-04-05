import { GameError } from './errors'
import { cardEquals } from './deck'
import type { Card } from '../types/card'
import type { InternalGameState, GamePhase } from '../types/game'

export function assertPlayerTurn(state: InternalGameState, userId: number): void {
  const currentPlayerId = state.playerIds[state.currentTurn]
  if (currentPlayerId !== userId) {
    throw new GameError('NOT_YOUR_TURN', `It is not player ${userId}'s turn`)
  }
}

export function assertPhase(state: InternalGameState, phase: GamePhase): void {
  if (state.phase !== phase) {
    throw new GameError('WRONG_PHASE', `Expected phase '${phase}', got '${state.phase}'`)
  }
}

export function assertHasCard(state: InternalGameState, userId: number, card: Card): void {
  const hand = state._hands[userId] ?? []
  const hasCard = hand.some(c => cardEquals(c, card))
  if (!hasCard) {
    throw new GameError('CARD_NOT_IN_HAND', `Player ${userId} does not have card ${card.r}${card.s}`)
  }
}
