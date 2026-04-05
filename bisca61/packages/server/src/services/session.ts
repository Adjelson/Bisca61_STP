import crypto from 'crypto'
import { prisma } from '../db/prisma'

export interface SessionData {
  userId: number
  username: string
  avatar: number
}

export async function createSession(data: SessionData): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex') // 64 hex chars
  await prisma.session.create({
    data: {
      token,
      userId: data.userId,
      username: data.username,
      avatar: data.avatar,
    },
  })
  return token
}

export async function validateSession(token: string): Promise<SessionData | null> {
  if (!token || token.length !== 64) return null
  const sess = await prisma.session.findUnique({ where: { token } })
  if (!sess) return null
  return { userId: sess.userId, username: sess.username, avatar: sess.avatar }
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {
    // ignore if already deleted
  })
}
