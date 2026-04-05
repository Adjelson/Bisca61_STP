import { create } from 'zustand'
import type { GameState, RoomInfo } from '../types'

interface GameStore {
  room: RoomInfo | null
  gameState: GameState | null
  isMyTurn: boolean
  setRoom: (room: RoomInfo) => void
  setGameState: (state: GameState, myUserId: number) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  gameState: null,
  isMyTurn: false,

  setRoom: (room) => set({ room }),

  setGameState: (state, myUserId) => {
    const currentPlayerId = state.playerIds[state.currentTurn]
    set({ gameState: state, isMyTurn: currentPlayerId === myUserId })
  },

  reset: () => set({ room: null, gameState: null, isMyTurn: false }),
}))
