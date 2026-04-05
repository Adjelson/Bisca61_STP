import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'
import { registerSocketMiddleware } from './middleware'
import { registerRoomHandlers } from './handlers/roomHandlers'
import { registerGameHandlers } from './handlers/gameHandlers'

export function registerSocketServer(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) {
  registerSocketMiddleware(io)

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.data.username} (${socket.data.userId})`)

    registerRoomHandlers(io, socket)
    registerGameHandlers(io, socket)

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.data.username} — ${reason}`)
    })
  })
}
