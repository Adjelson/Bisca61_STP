export type GameErrorCode =
  | 'NOT_YOUR_TURN'
  | 'WRONG_PHASE'
  | 'CARD_NOT_IN_HAND'
  | 'NO_TRUMP_CARD'
  | 'NO_SEVEN_OF_TRUMP'
  | 'ROOM_FULL'
  | 'ALREADY_STARTED'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ROOM_NOT_FOUND'

export class GameError extends Error {
  constructor(public readonly code: GameErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'GameError'
  }
}
