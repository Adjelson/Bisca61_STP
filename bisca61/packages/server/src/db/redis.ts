// In-memory store — replaces Redis for local dev (no Redis required)
import type { InternalGameState } from '@bisca61/shared'

export const memStore = new Map<string, InternalGameState>()

export const GAME_KEY = (code: string) => `bisca:game:${code}`
export const ROOM_KEY = (code: string) => `bisca:room:${code}`
