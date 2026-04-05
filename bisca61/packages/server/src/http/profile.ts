import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db/prisma'
import { validateSession } from '../services/session'

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/profile', async (req, reply) => {
    const token = (req.headers['x-token'] as string | undefined) ?? ''
    const session = await validateSession(token)
    if (!session) return reply.status(401).send({ error: 'Unauthorized' })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    return reply.send({
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      wins: user.wins,
      losses: user.losses,
      matchPts: user.matchPts,
      createdAt: user.createdAt.toISOString(),
    })
  })
}

export default profileRoutes
