/**
 * Module-level singleton for the ambient loop.
 * Lives for the entire app session — not tied to any screen lifecycle.
 */
import { Audio } from 'expo-av'

let _sound: Audio.Sound | null = null
let _muted = false
let _starting = false

export async function startAmbient(): Promise<void> {
  if (_muted || _starting) return

  // Already loaded — just resume
  if (_sound) {
    try { await _sound.playAsync() } catch {}
    return
  }

  _starting = true
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    })
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../assets/sounds/ambient_loop.wav') as number,
      { shouldPlay: true, isLooping: true, volume: 0.25 },
    )
    _sound = sound
  } catch {
    // silently ignore — ambient is optional
  } finally {
    _starting = false
  }
}

export async function stopAmbient(): Promise<void> {
  try { await _sound?.stopAsync() } catch {}
}

export function setAmbientMuted(muted: boolean): void {
  _muted = muted
  if (muted) _sound?.pauseAsync().catch(() => {})
  else       _sound?.playAsync().catch(() => {})
}
