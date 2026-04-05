import crypto from 'crypto'
import { prisma } from '../db/prisma'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

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
      userId:   data.userId,
      username: data.username,
      avatar:   data.avatar,
    },
  })
  return token
}

export async function validateSession(token: string): Promise<SessionData | null> {
  if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)) return null

  const sess = await prisma.session.findUnique({ where: { token } })
  if (!sess) return null

  // Reject expired sessions and clean them up
  if (Date.now() - sess.createdAt.getTime() > SESSION_TTL_MS) {
    await prisma.session.delete({ where: { token } }).catch(() => {})
    return null
  }

  return { userId: sess.userId, username: sess.username, avatar: sess.avatar }
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {})
}

// Periodic cleanup — call once at server startup
export async function purgeExpiredSessions(): Promise<void> {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS)
  await prisma.session.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {})
}
