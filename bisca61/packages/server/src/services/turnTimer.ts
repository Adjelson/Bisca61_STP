/**
 * Server-side turn-timer tracker.
 *
 * Stores when the current turn started for each room so that every
 * game:state broadcast can include a consistent `turnStartedAt` timestamp.
 * Both players receive the same value and can show a synchronised countdown.
 */
interface TurnEntry {
  turnIndex: number
  timestamp: number
}

const _map = new Map<string, TurnEntry>()

/**
 * Returns the timestamp (ms since epoch) for when the given turn started.
 * If the turn index changed since the last call, a fresh timestamp is recorded.
 */
export function getTurnTimestamp(code: string, currentTurnIndex: number): number {
  const stored = _map.get(code)
  if (!stored || stored.turnIndex !== currentTurnIndex) {
    const now = Date.now()
    _map.set(code, { turnIndex: currentTurnIndex, timestamp: now })
    return now
  }
  return stored.timestamp
}

/** Remove the timer entry when a game ends (normal or abandoned). */
export function clearTurnTimer(code: string): void {
  _map.delete(code)
}
