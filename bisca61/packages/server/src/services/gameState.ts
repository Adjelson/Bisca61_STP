import { memStore } from '../db/redis'
import { prisma } from '../db/prisma'
import type { InternalGameState } from '@bisca61/shared'

// ── Per-room mutex ─────────────────────────────────────────────────────────
// Prevents concurrent game:play / game:swap7 from both reading stale state,
// computing mutations in parallel, and overwriting each other.
const _locks = new Map<string, Promise<void>>()

export async function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const current = _locks.get(code) ?? Promise.resolve()
  let release!: () => void
  const next = new Promise<void>(r => { release = r })
  _locks.set(code, current.then(() => next))
  await current
  try {
    return await fn()
  } finally {
    release()
    // Clean up the map entry once this is the last waiter
    if (_locks.get(code) === next) _locks.delete(code)
  }
}

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
