import { buildDeck, shuffleDeck, cardEquals } from './deck'
import { buildTrumpRotation, nextTrump } from './trump'
import { trickPoints, teamOfPlayer } from './scoring'
import { assertPlayerTurn, assertPhase, assertHasCard } from './validation'
import { GameError } from './errors'
import { cardStrength } from '../types/card'
import type { Card, Suit } from '../types/card'
import type { InternalGameState, GameState, TablePlay, TrickHistory } from '../types/game'

// Determina se attacker bate current (força depende do naipe — preto vs vermelho)
function ganha(attacker: Card, current: Card, _leadSuit: Suit, trumpSuit: Suit): boolean {
  if (attacker.s === current.s) return cardStrength(attacker) > cardStrength(current)
  if (attacker.s === trumpSuit && current.s !== trumpSuit) return true
  if (current.s === trumpSuit && attacker.s !== trumpSuit) return false
  return false
}

// Find the winner of a completed trick — port of PHP resolverVaza winner detection
function findTrickWinner(plays: TablePlay[], trumpSuit: Suit): number {
  const leadPlay = plays[0]!
  const leadSuit = leadPlay.card.s

  let winnerPlay = leadPlay

  for (let i = 1; i < plays.length; i++) {
    const challenger = plays[i]!
    if (ganha(challenger.card, winnerPlay.card, leadSuit, trumpSuit)) {
      winnerPlay = challenger
    }
  }

  return winnerPlay.userId
}

// Build teams: 2 players = each alone; 4 players = slots 0+2 vs 1+3
function buildTeams(playerIds: number[], playerCount: 2 | 4): [number[], number[]] {
  if (playerCount === 2) {
    return [[playerIds[0]!], [playerIds[1]!]]
  }
  // 4-player: pairs by seat index
  return [
    [playerIds[0]!, playerIds[2]!],
    [playerIds[1]!, playerIds[3]!],
  ]
}

export class BiscaEngine {
  static newGame(playerIds: number[], playerCount: 2 | 4): InternalGameState {
    if (playerIds.length !== playerCount) {
      throw new Error(`Expected ${playerCount} players, got ${playerIds.length}`)
    }

    const fullDeck = shuffleDeck(buildDeck())

    // Deal 3 cards per player
    const hands: Record<number, Card[]> = {}
    for (const id of playerIds) {
      hands[id] = []
    }

    let deckIdx = 0
    for (let round = 0; round < 5; round++) {
      for (const id of playerIds) {
        const card = fullDeck[deckIdx++]!
        hands[id]!.push(card)
      }
    }

    // Next card is trump face-up
    const trumpCard = fullDeck[deckIdx++]!
    const trumpSuit = trumpCard.s

    // Remaining cards form the deck
    const deck = fullDeck.slice(deckIdx)

    const trumpRotation = buildTrumpRotation(trumpSuit)
    const trumpIdx = 0 // trumpSuit is trumpRotation[0]

    const teams = buildTeams(playerIds, playerCount)

    const initialLastDrawn: Record<number, Card | null> = {}
    for (const id of playerIds) initialLastDrawn[id] = null

    const state: InternalGameState = {
      phase: 'playing',
      playerCount,
      playerIds,
      teams,
      trumpSuit,
      trumpCard,
      trumpHorizontal: null,
      trumpRotation,
      trumpIdx,
      currentTurn: 0,
      table: [],
      points: [0, 0],
      tricks: [0, 0],
      trickNumber: 0,
      lastTrick: null,
      lastDrawn: initialLastDrawn,
      winner: null,
      _deck: deck,
      _hands: hands,
    }

    return state
  }

  static swap7(state: InternalGameState, userId: number): InternalGameState {
    assertPhase(state, 'playing')
    assertPlayerTurn(state, userId)

    // Clear previous draw reveals as soon as any action is taken
    const clearedDrawn: Record<number, Card | null> = {}
    for (const id of state.playerIds) clearedDrawn[id] = null
    state = { ...state, lastDrawn: clearedDrawn }

    if (!state.trumpCard) {
      throw new GameError('NO_TRUMP_CARD', 'No visible trump card to swap with')
    }

    const hand = state._hands[userId] ?? []
    const sevenOfTrump: Card = { s: state.trumpSuit, r: '7' }
    const sevenIdx = hand.findIndex(c => cardEquals(c, sevenOfTrump))

    if (sevenIdx === -1) {
      throw new GameError('NO_SEVEN_OF_TRUMP', 'Player does not have the 7 of trump')
    }

    // Swap
    const newHand = [...hand]
    const oldTrump = state.trumpCard
    newHand[sevenIdx] = oldTrump

    const newHands = { ...state._hands, [userId]: newHand }

    return {
      ...state,
      trumpCard: null,           // face-up slot is now empty
      trumpHorizontal: sevenOfTrump, // 7 goes horizontal on deck
      _hands: newHands,
    }
  }

  static playCard(state: InternalGameState, userId: number, card: Card): InternalGameState {
    assertPhase(state, 'playing')
    assertPlayerTurn(state, userId)
    assertHasCard(state, userId, card)

    // Clear previous draw reveals as soon as any action is taken
    const clearedDrawn: Record<number, Card | null> = {}
    for (const id of state.playerIds) clearedDrawn[id] = null
    state = { ...state, lastDrawn: clearedDrawn }

    // Remove card from hand
    const hand = state._hands[userId] ?? []
    const newHand = hand.filter(c => !cardEquals(c, card))
    const newHands: Record<number, Card[]> = { ...state._hands, [userId]: newHand }

    // Add to table
    const newTable: TablePlay[] = [...state.table, { userId, card }]

    let newState: InternalGameState = {
      ...state,
      table: newTable,
      _hands: newHands,
    }

    // Check if trick is complete
    if (newTable.length === state.playerCount) {
      newState = BiscaEngine.resolveTrick(newState)
    } else {
      // Advance turn
      const nextTurnIdx = (state.currentTurn + 1) % state.playerCount
      newState = { ...newState, currentTurn: nextTurnIdx }
    }

    return newState
  }

  private static resolveTrick(state: InternalGameState): InternalGameState {
    const { table, trumpSuit, playerIds, playerCount, teams } = state

    // Find winner
    const winnerUserId = findTrickWinner(table, trumpSuit)
    const winnerTeam = teamOfPlayer(teams, winnerUserId)

    // Award points
    const pts = trickPoints(table)
    const newPoints: [number, number] = [...state.points] as [number, number]
    newPoints[winnerTeam] += pts

    const newTricks: [number, number] = [...state.tricks] as [number, number]
    newTricks[winnerTeam] += 1

    // Winner's seat index
    const winnerSeatIdx = playerIds.indexOf(winnerUserId)

    // Draw cards in winner-first order
    let newDeck = [...state._deck]
    let newTrumpCard = state.trumpCard
    let newTrumpHorizontal = state.trumpHorizontal
    const newHands: Record<number, Card[]> = {}
    for (const id of playerIds) {
      newHands[id] = [...(state._hands[id] ?? [])]
    }

    // Track what each player draws (for brief client-side reveal)
    const newLastDrawn: Record<number, Card | null> = {}
    for (const id of playerIds) newLastDrawn[id] = null

    // Build draw order: winner first, then others in seat order
    const drawOrder: number[] = []
    for (let offset = 0; offset < playerCount; offset++) {
      const seatIdx = (winnerSeatIdx + offset) % playerCount
      drawOrder.push(playerIds[seatIdx]!)
    }

    // Winner draws: trumpCard first, then trumpHorizontal, then deck
    const winnerId = drawOrder[0]!
    if (newTrumpCard !== null) {
      newHands[winnerId]!.push(newTrumpCard)
      newLastDrawn[winnerId] = newTrumpCard
      newTrumpCard = null
    } else if (newTrumpHorizontal !== null) {
      newHands[winnerId]!.push(newTrumpHorizontal)
      newLastDrawn[winnerId] = newTrumpHorizontal
      newTrumpHorizontal = null
    } else if (newDeck.length > 0) {
      const drawn = newDeck.shift()!
      newHands[winnerId]!.push(drawn)
      newLastDrawn[winnerId] = drawn
    }

    // Other players draw in order
    for (let i = 1; i < drawOrder.length; i++) {
      const playerId = drawOrder[i]!
      // If trumpHorizontal still present give it to the first non-winner who needs it (slot 1 relative to winner)
      if (i === 1 && newTrumpHorizontal !== null) {
        newHands[playerId]!.push(newTrumpHorizontal)
        newLastDrawn[playerId] = newTrumpHorizontal
        newTrumpHorizontal = null
      } else if (newDeck.length > 0) {
        const drawn = newDeck.shift()!
        newHands[playerId]!.push(drawn)
        newLastDrawn[playerId] = drawn
      }
    }

    // After draws: if deck still has cards, reveal new trump
    let newTrumpSuit = trumpSuit
    let newTrumpRotation = [...state.trumpRotation]
    let newTrumpIdx = state.trumpIdx

    if (newDeck.length > 0 && newTrumpCard === null) {
      // Advance trump rotation
      const { suit, idx } = nextTrump(newTrumpRotation, newTrumpIdx)
      newTrumpSuit = suit
      newTrumpIdx = idx

      // Reveal new trump card from deck
      newTrumpCard = newDeck.shift()!
    }

    // Record trick history
    const prevTrumpSuit = trumpSuit
    const trickHistory: TrickHistory = {
      winnerUserId,
      plays: [...table],
      points: pts,
      prevTrumpSuit,
      newTrumpSuit,
    }

    // Check if game is finished (all hands empty)
    const allHandsEmpty = playerIds.every(id => (newHands[id]?.length ?? 0) === 0)

    let phase = state.phase
    let winner: 0 | 1 | -1 | null = state.winner

    if (allHandsEmpty) {
      phase = 'finished'
      const [p0, p1] = newPoints
      if (p0! > p1!) winner = 0
      else if (p1! > p0!) winner = 1
      else winner = -1
    }

    // Winner of trick leads next
    const nextTurnIdx = playerIds.indexOf(winnerUserId)

    return {
      ...state,
      phase,
      currentTurn: nextTurnIdx,
      table: [],
      trumpSuit: newTrumpSuit,
      trumpCard: newTrumpCard,
      trumpHorizontal: newTrumpHorizontal,
      trumpRotation: newTrumpRotation,
      trumpIdx: newTrumpIdx,
      points: newPoints,
      tricks: newTricks,
      trickNumber: state.trickNumber + 1,
      lastTrick: trickHistory,
      lastDrawn: newLastDrawn,
      winner,
      _deck: newDeck,
      _hands: newHands,
    }
  }

  static viewFor(state: InternalGameState, userId: number): GameState {
    const hand = state._hands[userId] ?? []
    const handCounts: Record<number, number> = {}
    for (const id of state.playerIds) {
      handCounts[id] = state._hands[id]?.length ?? 0
    }

    const {
      _deck,
      _hands,
      lastDrawn: internalLastDrawn,
      ...publicState
    } = state

    // Only expose own hand in allHands — opponent cards stay hidden
    const allHands: Record<number, Card[]> = {}
    for (const id of state.playerIds) {
      allHands[id] = id === userId ? hand : []
    }

    // lastDrawn exposes all drawn cards briefly for the animation
    // (server sends real cards; client discards them after animation)
    const lastDrawn: Record<number, Card | null> = { ...internalLastDrawn }

    return {
      ...publicState,
      hand,
      handCounts,
      deckCount: _deck.length,
      allHands,
      lastDrawn,
    }
  }
}
