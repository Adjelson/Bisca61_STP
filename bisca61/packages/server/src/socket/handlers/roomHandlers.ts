import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'
import { GameError, BiscaEngine } from '@bisca61/shared'
import { joinRoom, leaveRoom, startGame, getRoomInfo } from '../../services/roomService'
import { loadState, deleteState } from '../../services/gameState'
import { getTurnTimestamp, clearTurnTimer } from '../../services/turnTimer'
import { emitStateToAll } from './gameHandlers'
import { prisma } from '../../db/prisma'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

/**
 * End a game early because a player left or disconnected.
 * Idempotent — safe to call multiple times (checks status before acting).
 */
async function abandonGame(
  io: IO,
  code: string,
  leavingUserId: number,
  leavingUsername: string,
): Promise<void> {
  try {
    // Guard against double-abandon (e.g. room:leave + disconnect firing close together)
    const info = await getRoomInfo(code)
    if (!info || info.status === 'finished') return

    const state = await loadState(code)

    io.to(code).emit('game:abandoned', {
      userId:   leavingUserId,
      username: leavingUsername,
      points:   state?.points ?? [0, 0],
      tricks:   state?.tricks ?? [0, 0],
    })

    clearTurnTimer(code)

    await prisma.room.update({
      where: { code },
      data:  { status: 'finished' },
    }).catch(() => {})

    await deleteState(code)
  } catch {
    // Ensure clients never stay frozen even if db operations fail
    io.to(code).emit('game:abandoned', {
      userId:   leavingUserId,
      username: leavingUsername,
      points:   [0, 0],
      tricks:   [0, 0],
    })
  }
}

export function registerRoomHandlers(io: IO, socket: Sock) {
  const { userId, username, avatar } = socket.data

  // ── room:join ─────────────────────────────────────────────────────────────
  socket.on('room:join', async (code, ack) => {
    try {
      const existing = await getRoomInfo(code)

      if (existing?.status === 'playing') {
        // Reconnecting mid-game — re-send current state with timestamp
        socket.join(code)
        const state = await loadState(code)
        if (state) {
          const turnStartedAt = getTurnTimestamp(code, state.currentTurn)
          const view = BiscaEngine.viewFor(state, userId)
          socket.emit('game:state', { ...view, turnStartedAt })
        }
        ack(null, existing)
        return
      }

      const room = await joinRoom(code, userId, username, avatar)
      socket.join(code)

      io.to(code).emit('room:updated', room)
      io.to(code).emit('player:joined', {
        userId, username, avatar,
        slot: room.players.find(p => p.userId === userId)!.slot,
      })

      ack(null, room)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })

  // ── room:leave ────────────────────────────────────────────────────────────
  socket.on('room:leave', async (code) => {
    try {
      const info = await getRoomInfo(code)

      if (!info || info.status === 'finished') {
        socket.leave(code)
        return
      }

      if (info.status === 'playing') {
        await abandonGame(io, code, userId, username)
      } else {
        // Waiting room — remove player and notify others
        const updated = await leaveRoom(code, userId)
        if (updated) io.to(code).emit('room:updated', updated)
        io.to(code).emit('player:left', userId)
      }

      socket.leave(code)
    } catch {
      socket.leave(code)
    }
  })

  // ── game:start ────────────────────────────────────────────────────────────
  socket.on('game:start', async (code, ack) => {
    try {
      await startGame(code, userId)

      const state = await loadState(code)
      const room  = await getRoomInfo(code)

      if (state && room) {
        io.to(code).emit('room:updated', room)
        // emitStateToAll initialises the turn timer for the first turn
        await emitStateToAll(io, code, state)
      }

      ack(null)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })

  // ── game:pause ────────────────────────────────────────────────────────────
  socket.on('game:pause', (code) => {
    socket.to(code).emit('player:paused', userId)
  })

  // ── game:resume ───────────────────────────────────────────────────────────
  socket.on('game:resume', (code) => {
    socket.to(code).emit('player:resumed', userId)
  })

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id)

    for (const code of rooms) {
      try {
        const info = await getRoomInfo(code)
        if (!info || info.status === 'finished') continue

        if (info.status === 'playing') {
          await abandonGame(io, code, userId, username)
        } else {
          const updated = await leaveRoom(code, userId)
          if (updated) io.to(code).emit('room:updated', updated)
          io.to(code).emit('player:left', userId)
        }
      } catch {
        io.to(code).emit('player:left', userId)
      }
    }
  })
}
