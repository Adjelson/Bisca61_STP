import type { FastifyPluginAsync } from 'fastify'
import { validateSession } from '../services/session'
import { createRoom, listOpenRooms } from '../services/roomService'
import { CreateRoomSchema } from '@bisca61/shared'

async function requireAuth(req: any, reply: any) {
  const token = (req.headers['x-token'] as string | undefined) ?? ''
  const session = await validateSession(token)
  if (!session) {
    reply.status(401).send({ error: 'Unauthorized' })
    return null
  }
  return session
}

const roomRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/rooms — list open rooms
  fastify.get('/', async (_req, reply) => {
    const rooms = await listOpenRooms()
    return reply.send({ rooms })
  })

  // POST /api/rooms — create a room
  fastify.post('/', async (req, reply) => {
    const session = await requireAuth(req, reply)
    if (!session) return

    const body = CreateRoomSchema.safeParse(req.body)
    if (!body.success) {
      return reply.status(400).send({ error: body.error.flatten().fieldErrors })
    }

    try {
      const room = await createRoom(
        session.userId,
        session.username,
        session.avatar,
        body.data.playerCount,
      )
      return reply.status(201).send({ room })
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })
}

export default roomRoutes
