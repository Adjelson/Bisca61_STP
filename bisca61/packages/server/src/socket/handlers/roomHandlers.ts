import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'
import { GameError, BiscaEngine } from '@bisca61/shared'
import { joinRoom, leaveRoom, startGame, getRoomInfo } from '../../services/roomService'
import { loadState } from '../../services/gameState'

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export function registerRoomHandlers(io: IO, socket: Sock) {
  const { userId, username, avatar } = socket.data

  // room:join — join a room by code
  socket.on('room:join', async (code, ack) => {
    try {
      // If game already in progress, reconnect without calling joinRoom
      const existing = await getRoomInfo(code)
      if (existing?.status === 'playing') {
        socket.join(code)
        const state = await loadState(code)
        if (state) {
          const view = BiscaEngine.viewFor(state, userId)
          socket.emit('game:state', view)
        }
        ack(null, existing)
        return
      }

      const room = await joinRoom(code, userId, username, avatar)

      socket.join(code)

      // Notify everyone in the room
      io.to(code).emit('room:updated', room)
      io.to(code).emit('player:joined', { userId, username, avatar, slot: room.players.find(p => p.userId === userId)!.slot })

      ack(null, room)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })

  // room:leave — leave a room
  socket.on('room:leave', async (code) => {
    try {
      const updated = await leaveRoom(code, userId)
      socket.leave(code)

      if (updated) {
        io.to(code).emit('room:updated', updated)
      }
      io.to(code).emit('player:left', userId)
    } catch {
      // silently ignore leave errors
    }
  })

  // game:start — host starts the game
  socket.on('game:start', async (code, ack) => {
    try {
      await startGame(code, userId)

      const state = await loadState(code)
      const room = await getRoomInfo(code)

      if (state && room) {
        io.to(code).emit('room:updated', room)

        // Emit personalised game state to each connected socket in room
        const sockets = await io.in(code).fetchSockets()
        for (const s of sockets) {
          const view = BiscaEngine.viewFor(state, s.data.userId)
          s.emit('game:state', view)
        }
      }

      ack(null)
    } catch (err: any) {
      ack(err instanceof GameError ? err.code : err.message)
    }
  })

  // Handle disconnection — only remove player from WAITING rooms (not playing games)
  socket.on('disconnect', async () => {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id)
    for (const code of rooms) {
      try {
        const info = await getRoomInfo(code)
        if (!info) continue

        if (info.status === 'waiting') {
          // Remove from lobby — if room empties it gets deleted
          const updated = await leaveRoom(code, userId)
          if (updated) io.to(code).emit('room:updated', updated)
        }
        // Always notify clients so they can update presence indicators
        io.to(code).emit('player:left', userId)
      } catch {
        io.to(code).emit('player:left', userId)
      }
    }
  })
}
