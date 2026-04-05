import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'
import { GameError, BiscaEngine } from '@bisca61/shared'
import { loadState, saveState } from '../../services/gameState'
import { prisma } from '../../db/prisma'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

async function emitStateToRoom(io: IO, code: string, state: Parameters<typeof BiscaEngine.viewFor>[0]) {
  const sockets = await io.in(code).fetchSockets()
  for (const s of sockets) {
    const view = BiscaEngine.viewFor(state, s.data.userId)
    s.emit('game:state', view)
  }
}

export function registerGameHandlers(io: IO, socket: Sock) {
  const { userId } = socket.data

  // game:play — play a card
  socket.on('game:play', async (code, card, ack) => {
    try {
      const state = await loadState(code)
      if (!state) throw new GameError('ROOM_NOT_FOUND', `No active game for room ${code}`)

      const newState = BiscaEngine.playCard(state, userId, card)
      await saveState(code, newState)

      // Send personalised state to all players
      await emitStateToRoom(io, code, newState)

      // If game finished, update DB stats and emit ended event
      if (newState.phase === 'finished' && newState.winner !== null) {
        const summary = {
          winnerTeam: newState.winner,
          points: newState.points,
          tricks: newState.tricks,
        }

        io.to(code).emit('game:ended', summary)

        // Update win/loss stats
        for (const playerId of newState.playerIds) {
          const team = newState.teams[0].includes(playerId) ? 0 : 1
          if (newState.winner === -1) continue // draw

          if (team === newState.winner) {
            await prisma.user.update({
              where: { id: playerId },
              data: { wins: { increment: 1 }, matchPts: { increment: 3 } },
            })
          } else {
            await prisma.user.update({
              where: { id: playerId },
              data: { losses: { increment: 1 } },
            })
          }
        }

        // Mark room as finished
        await prisma.room.update({
          where: { code },
          data: { status: 'finished' },
        })
      }

      ack(null)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })

  // game:swap7 — swap the 7 of trump with the visible trump card
  socket.on('game:swap7', async (code, ack) => {
    try {
      const state = await loadState(code)
      if (!state) throw new GameError('ROOM_NOT_FOUND')

      const newState = BiscaEngine.swap7(state, userId)
      await saveState(code, newState)

      await emitStateToRoom(io, code, newState)

      ack(null)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })
}
