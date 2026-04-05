import { useEffect, useRef, useCallback } from 'react'
import { Audio, AVPlaybackSource } from 'expo-av'
import { AppState, AppStateStatus } from 'react-native'
import { setAmbientMuted } from '../utils/ambientSound'

// ── Effect sounds only (ambient is a singleton in ambientSound.ts) ─────────────
const SOUNDS = {
  cardPlay:  require('../../assets/sounds/card_play.wav')  as AVPlaybackSource,
  cardDraw:  require('../../assets/sounds/card_draw.wav')  as AVPlaybackSource,
  trickWin:  require('../../assets/sounds/trick_win.wav')  as AVPlaybackSource,
  trickLose: require('../../assets/sounds/trick_lose.wav') as AVPlaybackSource,
  yourTurn:  require('../../assets/sounds/your_turn.wav')  as AVPlaybackSource,
  gameWin:   require('../../assets/sounds/game_win.wav')   as AVPlaybackSource,
  gameLose:  require('../../assets/sounds/game_lose.wav')  as AVPlaybackSource,
  buttonTap: require('../../assets/sounds/button_tap.wav') as AVPlaybackSource,
  swap7:     require('../../assets/sounds/swap7.wav')      as AVPlaybackSource,
}

type SoundKey = keyof typeof SOUNDS

export function useSounds() {
  const pool  = useRef<Partial<Record<SoundKey, Audio.Sound>>>({})
  const muted = useRef(false)

  // Load effect sounds on mount
  useEffect(() => {
    let cancelled = false

    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch(() => {})

    async function load() {
      for (const key of Object.keys(SOUNDS) as SoundKey[]) {
        try {
          const { sound } = await Audio.Sound.createAsync(SOUNDS[key], { shouldPlay: false })
          if (!cancelled) pool.current[key] = sound
        } catch {}
      }
    }

    load()

    return () => {
      cancelled = true
      for (const sound of Object.values(pool.current)) {
        sound?.unloadAsync().catch(() => {})
      }
      pool.current = {}
    }
  }, [])

  // Pause effect sounds when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') {
        for (const sound of Object.values(pool.current)) {
          sound?.pauseAsync().catch(() => {})
        }
      }
    })
    return () => sub.remove()
  }, [])

  const play = useCallback(async (key: SoundKey) => {
    if (muted.current) return
    const sound = pool.current[key]
    if (!sound) return
    try {
      await sound.setPositionAsync(0)
      await sound.playAsync()
    } catch {}
  }, [])

  const setMuted = useCallback((value: boolean) => {
    muted.current = value
    setAmbientMuted(value)
  }, [])

  return {
    playCardPlay:  () => play('cardPlay'),
    playCardDraw:  () => play('cardDraw'),
    playTrickWin:  () => play('trickWin'),
    playTrickLose: () => play('trickLose'),
    playYourTurn:  () => play('yourTurn'),
    playGameWin:   () => play('gameWin'),
    playGameLose:  () => play('gameLose'),
    playButtonTap: () => play('buttonTap'),
    playSwap7:     () => play('swap7'),
    setMuted,
  }
}
