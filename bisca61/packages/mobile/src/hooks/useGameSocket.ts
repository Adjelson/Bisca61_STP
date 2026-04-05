import { useEffect, useRef } from 'react'
import { getSocket } from '../socket/socketClient'
import { useAuthStore, getToken } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import type { Card, GameSummary } from '../types'

interface Options {
  code: string
  onGameEnded: (summary: GameSummary) => void
  onError: (msg: string) => void
}

export function useGameSocket({ code, onGameEnded, onError }: Options) {
  const userId  = useAuthStore(s => s.userId)
  const setRoom = useGameStore(s => s.setRoom)
  const setGame = useGameStore(s => s.setGameState)
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  useEffect(() => {
    if (!code || !userId) return

    let active = true

    getToken().then((token) => {
      if (!active || !token) return

      const socket = getSocket(token)
      socketRef.current = socket

      if (!socket.connected) socket.connect()

      socket.emit('room:join', code, (err, room) => {
        if (!active) return
        if (err) { onError(err); return }
        if (room) setRoom(room)
      })

      socket.on('room:updated', (room) => { if (active) setRoom(room) })
      socket.on('game:state',   (state) => { if (active) setGame(state, userId) })
      socket.on('game:ended',   (summary) => { if (active) onGameEnded(summary) })
      socket.on('error',        (msg) => { if (active) onError(msg) })
    })

    return () => {
      active = false
      // Não deixar a sala se o jogo já começou (navegação Room → Play)
      const { gameState } = useGameStore.getState()
      if (!gameState || gameState.phase !== 'playing') {
        socketRef.current?.emit('room:leave', code)
      }
      socketRef.current?.off('room:updated')
      socketRef.current?.off('game:state')
      socketRef.current?.off('game:ended')
      socketRef.current?.off('error')
    }
  }, [code, userId])

  function startGame(): Promise<string | null> {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:start', code, (err) => resolve(err))
    })
  }

  function playCard(card: Card): Promise<string | null> {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:play', code, card, (err) => resolve(err))
    })
  }

  function swap7(): Promise<string | null> {
    return new Promise((resolve) => {
      socketRef.current?.emit('game:swap7', code, (err) => resolve(err))
    })
  }

  return { startGame, playCard, swap7 }
}
