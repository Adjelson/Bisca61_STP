import './config' // validates env vars first
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Server } from 'socket.io'
import { config } from './config'
import { prisma } from './db/prisma'
import { registerSocketServer } from './socket/index'
import { startPersistWorker } from './jobs/persistWorker'
import authRoutes from './http/auth'
import roomRoutes from './http/rooms'
import profileRoutes from './http/profile'
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@bisca61/shared'

async function main() {
  // 1. Fastify HTTP server
  const fastify = Fastify({
    logger: config.NODE_ENV === 'development',
  })

  const allowedOrigins = config.ALLOWED_ORIGINS === '*'
    ? true
    : config.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  await fastify.register(cors, { origin: allowedOrigins })
  await fastify.register(authRoutes,    { prefix: '/api/auth' })
  await fastify.register(roomRoutes,    { prefix: '/api/rooms' })
  await fastify.register(profileRoutes, { prefix: '/api' })

  fastify.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }))

  // 2. Connect to MySQL
  await prisma.$connect()
  console.log('[Prisma] Connected to MySQL')

  // 3. Start persist worker
  startPersistWorker()

  // 4. Boot Fastify so fastify.server is ready
  await fastify.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`[Server] Listening on http://0.0.0.0:${config.PORT}`)

  // 5. Attach Socket.IO directly to fastify.server (already listening)
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    fastify.server,
    {
      cors: { origin: config.ALLOWED_ORIGINS === '*' ? '*' : config.ALLOWED_ORIGINS.split(',').map(o => o.trim()) },
      transports: ['websocket', 'polling'],
    },
  )

  registerSocketServer(io)
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err)
  process.exit(1)
})
