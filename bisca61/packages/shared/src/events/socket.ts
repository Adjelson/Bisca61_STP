import type { Card } from '../types/card'
import type { GameState } from '../types/game'
import type { RoomInfo } from '../types/room'

export interface GameSummary {
  winnerTeam: 0 | 1 | -1
  points: [number, number]
  tricks: [number, number]
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
  'room:updated':   (room: RoomInfo) => void
  'game:state':     (state: GameState) => void
  'game:ended':     (summary: GameSummary) => void
  'player:joined':  (p: { userId: number; username: string; avatar: number; slot: number }) => void
  'player:left':    (userId: number) => void
  'error':          (msg: string) => void
}

export interface InterServerEvents {}

export interface SocketData {
  userId: number
  username: string
  avatar: number
  token: string
}
