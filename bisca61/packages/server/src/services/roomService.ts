import { prisma } from '../db/prisma'
import { generateRoomCode } from '../utils/roomCode'
import { BiscaEngine, GameError } from '@bisca61/shared'
import { saveState } from './gameState'
import type { RoomInfo } from '@bisca61/shared'

function toRoomInfo(room: {
  code: string
  playerCount: number
  status: string
  hostId: number
  createdAt: Date
  players: Array<{ userId: number; username: string; avatar: number; slot: number }>
}): RoomInfo {
  return {
    code: room.code,
    playerCount: room.playerCount as 2 | 4,
    status: room.status as RoomInfo['status'],
    hostId: room.hostId,
    createdAt: room.createdAt.toISOString(),
    players: room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      slot: p.slot,
    })),
  }
}

const INCLUDE_PLAYERS = { players: { orderBy: { slot: 'asc' as const } } }

export async function createRoom(
  hostId: number,
  username: string,
  avatar: number,
  playerCount: 2 | 4,
): Promise<RoomInfo> {
  let code: string
  let attempts = 0

  // Generate unique code
  do {
    code = generateRoomCode()
    attempts++
    if (attempts > 10) throw new Error('Failed to generate unique room code')
  } while (await prisma.room.findUnique({ where: { code } }))

  const room = await prisma.room.create({
    data: {
      code,
      playerCount,
      hostId,
      players: {
        create: { userId: hostId, username, avatar, slot: 0 },
      },
    },
    include: INCLUDE_PLAYERS,
  })

  return toRoomInfo(room)
}

export async function joinRoom(
  code: string,
  userId: number,
  username: string,
  avatar: number,
): Promise<RoomInfo> {
  const room = await prisma.room.findUnique({
    where: { code },
    include: INCLUDE_PLAYERS,
  })

  if (!room) throw new GameError('ROOM_NOT_FOUND', `Room ${code} not found`)
  if (room.status !== 'waiting') throw new GameError('ALREADY_STARTED', 'Game already started')

  // Already in room — return current state
  const existing = room.players.find(p => p.userId === userId)
  if (existing) return toRoomInfo(room)

  if (room.players.length >= room.playerCount) {
    throw new GameError('ROOM_FULL', 'Room is full')
  }

  // Find next free slot
  const usedSlots = new Set(room.players.map(p => p.slot))
  let slot = 0
  while (usedSlots.has(slot)) slot++

  const updated = await prisma.room.update({
    where: { code },
    data: {
      players: { create: { userId, username, avatar, slot } },
    },
    include: INCLUDE_PLAYERS,
  })

  return toRoomInfo(updated)
}

export async function leaveRoom(code: string, userId: number): Promise<RoomInfo | null> {
  const room = await prisma.room.findUnique({ where: { code }, include: INCLUDE_PLAYERS })
  if (!room) return null

  await prisma.roomPlayer.deleteMany({ where: { roomCode: code, userId } })

  const remaining = room.players.filter(p => p.userId !== userId)

  if (remaining.length === 0) {
    // Delete empty room
    await prisma.room.delete({ where: { code } }).catch(() => {})
    return null
  }

  // If host left, transfer host to slot 0
  let hostId = room.hostId
  if (hostId === userId) {
    hostId = remaining[0]!.userId
    await prisma.room.update({ where: { code }, data: { hostId } })
  }

  return toRoomInfo({ ...room, hostId, players: remaining })
}

export async function startGame(code: string, requestingUserId: number): Promise<void> {
  const room = await prisma.room.findUnique({ where: { code }, include: INCLUDE_PLAYERS })

  if (!room) throw new GameError('ROOM_NOT_FOUND')
  if (room.hostId !== requestingUserId) throw new GameError('NOT_HOST', 'Only the host can start the game')
  if (room.status !== 'waiting') throw new GameError('ALREADY_STARTED')
  if (room.players.length < room.playerCount) {
    throw new GameError('NOT_ENOUGH_PLAYERS', `Need ${room.playerCount} players, have ${room.players.length}`)
  }

  const sortedPlayers = [...room.players].sort((a, b) => a.slot - b.slot)
  const playerIds = sortedPlayers.map(p => p.userId)
  const state = BiscaEngine.newGame(playerIds, room.playerCount as 2 | 4)

  await saveState(code, state)
  await prisma.room.update({ where: { code }, data: { status: 'playing' } })
}

export async function getRoomInfo(code: string): Promise<RoomInfo | null> {
  const room = await prisma.room.findUnique({ where: { code }, include: INCLUDE_PLAYERS })
  if (!room) return null
  return toRoomInfo(room)
}

export async function listOpenRooms(): Promise<RoomInfo[]> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000) // ignore rooms older than 1 hour

  const rooms = await prisma.room.findMany({
    where: { status: 'waiting', createdAt: { gte: cutoff } },
    include: INCLUDE_PLAYERS,
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Only return rooms with available slots
  return rooms
    .filter(r => r.players.length < r.playerCount)
    .map(toRoomInfo)
}
