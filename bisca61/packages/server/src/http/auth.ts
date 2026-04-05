import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../db/prisma'
import { createSession, validateSession, deleteSession } from '../services/session'
import { LoginSchema, RegisterSchema } from '@bisca61/shared'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/register — criar conta nova
  fastify.post('/register', async (req, reply) => {
    const body = RegisterSchema.safeParse(req.body)
    if (!body.success) {
      const msgs = Object.values(body.error.flatten().fieldErrors).flat()
      return reply.status(400).send({ error: msgs[0] ?? 'Dados inválidos' })
    }

    const { username, password, avatar } = body.data

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return reply.status(409).send({ error: 'USERNAME_TAKEN' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, password: hash, avatar },
    })

    const token = await createSession({ userId: user.id, username: user.username, avatar: user.avatar })

    return reply.status(201).send({
      token,
      userId:   user.id,
      username: user.username,
      avatar:   user.avatar,
      wins:     user.wins,
      losses:   user.losses,
      matchPts: user.matchPts,
    })
  })

  // POST /api/auth/login — entrar com conta existente
  fastify.post('/login', async (req, reply) => {
    const body = LoginSchema.safeParse(req.body)
    if (!body.success) {
      const msgs = Object.values(body.error.flatten().fieldErrors).flat()
      return reply.status(400).send({ error: msgs[0] ?? 'Dados inválidos' })
    }

    const { username, password } = body.data

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS' })
    }

    const token = await createSession({ userId: user.id, username: user.username, avatar: user.avatar })

    return reply.send({
      token,
      userId:   user.id,
      username: user.username,
      avatar:   user.avatar,
      wins:     user.wins,
      losses:   user.losses,
      matchPts: user.matchPts,
    })
  })

  // GET /api/auth/me
  fastify.get('/me', async (req, reply) => {
    const token = (req.headers['x-token'] as string | undefined) ?? ''
    const session = await validateSession(token)
    if (!session) return reply.status(401).send({ error: 'Unauthorized' })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    return reply.send({
      userId:   user.id,
      username: user.username,
      avatar:   user.avatar,
      wins:     user.wins,
      losses:   user.losses,
      matchPts: user.matchPts,
    })
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (req, reply) => {
    const token = (req.headers['x-token'] as string | undefined) ?? ''
    await deleteSession(token)
    return reply.send({ ok: true })
  })
}

export default authRoutes
