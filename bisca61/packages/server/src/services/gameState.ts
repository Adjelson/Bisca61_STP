import { memStore } from '../db/redis'
import { prisma } from '../db/prisma'
import type { InternalGameState } from '@bisca61/shared'

export async function loadState(code: string): Promise<InternalGameState | null> {
  // Check in-memory store first
  const cached = memStore.get(code)
  if (cached) return cached

  // Fallback to MySQL
  const row = await prisma.gameStateRow.findUnique({ where: { roomCode: code } })
  if (!row) return null

  const state = JSON.parse(row.stateJson) as InternalGameState
  memStore.set(code, state)
  return state
}

export async function saveState(code: string, state: InternalGameState): Promise<void> {
  memStore.set(code, state)

  // Persist to MySQL directly (no queue needed)
  const stateJson = JSON.stringify(state)
  await prisma.gameStateRow.upsert({
    where: { roomCode: code },
    create: { roomCode: code, stateJson },
    update: { stateJson },
  })
}

export async function deleteState(code: string): Promise<void> {
  memStore.delete(code)
  await prisma.gameStateRow.deleteMany({ where: { roomCode: code } }).catch(() => {})
}
