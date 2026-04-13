import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'
import { GameError, BiscaEngine } from '@bisca61/shared'
import { loadState, saveState, withRoomLock } from '../../services/gameState'
import { getTurnTimestamp } from '../../services/turnTimer'
import { prisma } from '../../db/prisma'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

/**
 * Emit a personalised game:state to every socket in the room.
 * Injects `turnStartedAt` so both clients display a synchronised countdown.
 * Exported so roomHandlers can reuse it on game:start and reconnect.
 */
export async function emitStateToAll(
  io: IO,
  code: string,
  state: Parameters<typeof BiscaEngine.viewFor>[0],
): Promise<void> {
  const turnStartedAt = getTurnTimestamp(code, state.currentTurn)
  const sockets = await io.in(code).fetchSockets()
  for (const s of sockets) {
    const view = BiscaEngine.viewFor(state, s.data.userId)
    s.emit('game:state', { ...view, turnStartedAt })
  }
}

export function registerGameHandlers(io: IO, socket: Sock) {
  const { userId } = socket.data

  // ── game:play ─────────────────────────────────────────────────────────────
  socket.on('game:play', async (code, card, ack) => {
    try {
      await withRoomLock(code, async () => {
        const state = await loadState(code)
        if (!state) throw new GameError('ROOM_NOT_FOUND', `No active game for room ${code}`)

        const newState = BiscaEngine.playCard(state, userId, card)
        await saveState(code, newState)

        await emitStateToAll(io, code, newState)

        // Game finished — update stats and emit game:ended
        if (newState.phase === 'finished' && newState.winner !== null) {
          const summary = {
            winnerTeam: newState.winner,
            points:     newState.points,
            tricks:     newState.tricks,
          }

          io.to(code).emit('game:ended', summary)

          for (const playerId of newState.playerIds) {
            if (newState.winner === -1) continue // draw
            const team = newState.teams[0].includes(playerId) ? 0 : 1
            if (team === newState.winner) {
              await prisma.user.update({
                where: { id: playerId },
                data:  { wins: { increment: 1 }, matchPts: { increment: 3 } },
              })
            } else {
              await prisma.user.update({
                where: { id: playerId },
                data:  { losses: { increment: 1 } },
              })
            }
          }

          await prisma.room.update({ where: { code }, data: { status: 'finished' } })
        }
      })

      ack(null)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })

  // ── game:swap7 ────────────────────────────────────────────────────────────
  socket.on('game:swap7', async (code, ack) => {
    try {
      await withRoomLock(code, async () => {
        const state = await loadState(code)
        if (!state) throw new GameError('ROOM_NOT_FOUND')

        const newState = BiscaEngine.swap7(state, userId)
        await saveState(code, newState)

        await emitStateToAll(io, code, newState)
      })

      ack(null)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })
}
