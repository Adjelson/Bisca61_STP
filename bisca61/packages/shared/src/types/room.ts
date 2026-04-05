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
  createdAt: string
}
