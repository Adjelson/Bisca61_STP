import { useEffect, useRef, useCallback } from 'react'
import { getSocket } from '../socket/socketClient'
import { useAuthStore, getToken } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import type { Card, GameSummary } from '../types'

interface Options {
  code: string
  onGameEnded: (summary: GameSummary) => void
  onError: (msg: string) => void
}

// Wraps a socket ack emit in a timeout so the UI never locks permanently
function emitWithTimeout<T>(
  emitFn: (resolve: (result: T) => void) => void,
  timeoutMs = 8000,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('TIMEOUT' as unknown as T), timeoutMs)
    emitFn((result) => {
      clearTimeout(timer)
      resolve(result)
    })
  })
}

export function useGameSocket({ code, onGameEnded, onError }: Options) {
  const userId  = useAuthStore(s => s.userId)
  const setRoom = useGameStore(s => s.setRoom)
  const setGame = useGameStore(s => s.setGameState)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  // Stable ref so the reconnect handler always has the latest callbacks
  const onGameEndedRef = useRef(onGameEnded)
  const onErrorRef     = useRef(onError)
  useEffect(() => { onGameEndedRef.current = onGameEnded }, [onGameEnded])
  useEffect(() => { onErrorRef.current     = onError     }, [onError])

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

      // Re-join room + refresh state after any reconnection (network drop recovery)
      function onReconnect() {
        if (!active) return
        joinRoom(socket)
      }

      socket.on('connect',      onReconnect)
      socket.on('room:updated', (room)    => { if (active) setRoom(room) })
      socket.on('game:state',   (state)   => { if (active) setGame(state, userId!) })
      socket.on('game:ended',   (summary) => { if (active) onGameEndedRef.current(summary) })
      socket.on('error',        (msg)     => { if (active) onErrorRef.current(msg) })

      return () => {
        socket.off('connect',      onReconnect)
      }
    })

    return () => {
      active = false
      const { gameState } = useGameStore.getState()
      if (!gameState || gameState.phase !== 'playing') {
        socketRef.current?.emit('room:leave', code)
      }
      socketRef.current?.off('room:updated')
      socketRef.current?.off('game:state')
      socketRef.current?.off('game:ended')
      socketRef.current?.off('error')
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

  return { startGame, playCard, swap7 }
}
