import type { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'
import { validateSession } from '../services/session'

export function registerSocketMiddleware(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined

    if (!token) {
      return next(new Error('AUTH_REQUIRED'))
    }

    const session = await validateSession(token)

    if (!session) {
      return next(new Error('INVALID_SESSION'))
    }

    socket.data = {
      userId: session.userId,
      username: session.username,
      avatar: session.avatar,
      token,
    }

    next()
  })
}
