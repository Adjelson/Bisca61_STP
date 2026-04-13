import { useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../socket/socketClient'
import { useAuthStore, getToken } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import type { Card, GameSummary, AbandonedInfo } from '../types'

interface Options {
  code: string
  onGameEnded:        (summary: GameSummary) => void
  onGameAbandoned:    (info: AbandonedInfo)  => void
  onOpponentPaused?:  (userId: number)       => void
  onOpponentResumed?: (userId: number)       => void
  onError:            (msg: string)          => void
}

function emitWithTimeout<T>(
  emitFn: (resolve: (result: T) => void) => void,
  timeoutMs = 8000,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('TIMEOUT' as unknown as T), timeoutMs)
    emitFn((result) => { clearTimeout(timer); resolve(result) })
  })
}

export function useGameSocket({
  code,
  onGameEnded,
  onGameAbandoned,
  onOpponentPaused,
  onOpponentResumed,
  onError,
}: Options) {
  const userId    = useAuthStore(s => s.userId)
  const setRoom   = useGameStore(s => s.setRoom)
  const setGame   = useGameStore(s => s.setGameState)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  // Stable refs so callbacks never go stale inside event handlers
  const onGameEndedRef       = useRef(onGameEnded)
  const onGameAbandonedRef   = useRef(onGameAbandoned)
  const onOpponentPausedRef  = useRef(onOpponentPaused)
  const onOpponentResumedRef = useRef(onOpponentResumed)
  const onErrorRef           = useRef(onError)
  useEffect(() => { onGameEndedRef.current       = onGameEnded       }, [onGameEnded])
  useEffect(() => { onGameAbandonedRef.current   = onGameAbandoned   }, [onGameAbandoned])
  useEffect(() => { onOpponentPausedRef.current  = onOpponentPaused  }, [onOpponentPaused])
  useEffect(() => { onOpponentResumedRef.current = onOpponentResumed }, [onOpponentResumed])
  useEffect(() => { onErrorRef.current           = onError           }, [onError])

  const joinRoom = useCallback((socket: ReturnType<typeof getSocket>) => {
    socket.emit('room:join', code, (err, room) => {
      if (err) { onErrorRef.current(err); return }
      if (room) setRoom(room)
    })
  }, [code, setRoom])

  useEffect(() => {
    if (!code || !userId) return

    let active = true

    getToken().then((token) => {
      if (!active || !token) return

      const socket = getSocket(token)
      socketRef.current = socket

      if (!socket.connected) socket.connect()

      joinRoom(socket)

      function onReconnect() {
        if (!active) return
        joinRoom(socket)
      }

      socket.on('connect',        onReconnect)
      socket.on('room:updated',   (room)    => { if (active) setRoom(room) })
      socket.on('game:state',     (state)   => { if (active) setGame(state, userId!) })
      socket.on('game:ended',     (summary) => { if (active) onGameEndedRef.current(summary) })
      socket.on('game:abandoned', (info)    => { if (active) onGameAbandonedRef.current(info) })
      socket.on('player:paused',  (uid)     => { if (active) onOpponentPausedRef.current?.(uid) })
      socket.on('player:resumed', (uid)     => { if (active) onOpponentResumedRef.current?.(uid) })
      socket.on('error',          (msg)     => { if (active) onErrorRef.current(msg) })

      return () => { socket.off('connect', onReconnect) }
    })

    return () => {
      active = false
      socketRef.current?.off('room:updated')
      socketRef.current?.off('game:state')
      socketRef.current?.off('game:ended')
      socketRef.current?.off('game:abandoned')
      socketRef.current?.off('player:paused')
      socketRef.current?.off('player:resumed')
      socketRef.current?.off('error')
      // Auto-leave only in waiting rooms; playing rooms call leaveGame() explicitly
      const { gameState } = useGameStore.getState()
      if (!gameState || gameState.phase !== 'playing') {
        socketRef.current?.emit('room:leave', code)
      }
    }
  }, [code, userId, joinRoom])

  const startGame = useCallback((): Promise<string | null> =>
    emitWithTimeout<string | null>((resolve) =>
      socketRef.current?.emit('game:start', code, (err) => resolve(err ?? null))
    ), [code])

  const playCard = useCallback((card: Card): Promise<string | null> =>
    emitWithTimeout<string | null>((resolve) =>
      socketRef.current?.emit('game:play', code, card, (err) => resolve(err ?? null))
    ), [code])

  const swap7 = useCallback((): Promise<string | null> =>
    emitWithTimeout<string | null>((resolve) =>
      socketRef.current?.emit('game:swap7', code, (err) => resolve(err ?? null))
    ), [code])

  /** Notify server the player is leaving (use before navigation.replace). */
  const leaveGame = useCallback(() => {
    socketRef.current?.emit('room:leave', code)
  }, [code])

  const pauseGame = useCallback(() => {
    socketRef.current?.emit('game:pause', code)
  }, [code])

  const resumeGame = useCallback(() => {
    socketRef.current?.emit('game:resume', code)
  }, [code])

  return { startGame, playCard, swap7, leaveGame, pauseGame, resumeGame }
}
