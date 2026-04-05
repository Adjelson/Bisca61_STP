/**
 * Generates simple PCM WAV sound effects for Bisca 61.
 * Run: node scripts/generate-sounds.js
 */
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '../assets/sounds')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const SAMPLE_RATE = 22050

// ── WAV writer ────────────────────────────────────────────────────────────────
function writeWav(filename, samples) {
  const numSamples = samples.length
  const dataSize = numSamples * 2
  const buf = Buffer.alloc(44 + dataSize)

  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)          // chunk size
  buf.writeUInt16LE(1, 20)           // PCM
  buf.writeUInt16LE(1, 22)           // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24)
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  buf.writeUInt16LE(2, 32)           // block align
  buf.writeUInt16LE(16, 34)          // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }

  fs.writeFileSync(path.join(OUT_DIR, filename), buf)
  console.log(`  wrote ${filename}  (${numSamples} samples, ${(dataSize / 1024).toFixed(1)} KB)`)
}

// ── Envelope helpers ──────────────────────────────────────────────────────────
function env(t, attack, decay, sustain, release, totalDur) {
  if (t < attack) return t / attack
  if (t < attack + decay) return 1 - (1 - sustain) * (t - attack) / decay
  if (t < totalDur - release) return sustain
  return sustain * (1 - (t - (totalDur - release)) / release)
}

function sine(freq, t) { return Math.sin(2 * Math.PI * freq * t) }
function noise() { return Math.random() * 2 - 1 }

// ── Sound generators ──────────────────────────────────────────────────────────

// card_play.wav — short woody thud + high click
function makeCardPlay() {
  const dur = 0.18
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    // woody body
    const body = Math.exp(-t * 40) * sine(180, t) * 0.6
    // click transient
    const click = Math.exp(-t * 200) * noise() * 0.35
    s[i] = body + click
  }
  writeWav('card_play.wav', s)
}

// card_draw.wav — soft swoosh
function makeCardDraw() {
  const dur = 0.22
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const e = env(t, 0.03, 0.05, 0.3, 0.12, dur)
    // filtered noise swoosh
    const freq = 800 + 1200 * (t / dur)
    s[i] = e * (noise() * 0.25 + sine(freq, t) * 0.08)
  }
  writeWav('card_draw.wav', s)
}

// trick_win.wav — bright ascending 3-note chime
function makeTrickWin() {
  const notes = [523, 659, 784] // C5 E5 G5
  const noteDur = 0.12
  const dur = notes.length * noteDur + 0.1
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  notes.forEach((freq, idx) => {
    const start = idx * noteDur
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE - start
      if (t < 0 || t > noteDur * 1.8) continue
      const e = Math.exp(-t * 14)
      s[i] += e * (sine(freq, t) * 0.45 + sine(freq * 2, t) * 0.15)
    }
  })
  writeWav('trick_win.wav', s)
}

// trick_lose.wav — dull descending 2-note thud
function makeTrickLose() {
  const notes = [392, 294] // G4 D4
  const noteDur = 0.15
  const dur = notes.length * noteDur + 0.1
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  notes.forEach((freq, idx) => {
    const start = idx * noteDur
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE - start
      if (t < 0 || t > noteDur * 1.8) continue
      const e = Math.exp(-t * 10)
      s[i] += e * sine(freq, t) * 0.4
    }
  })
  writeWav('trick_lose.wav', s)
}

// your_turn.wav — gentle ping
function makeYourTurn() {
  const dur = 0.35
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const e = Math.exp(-t * 9)
    s[i] = e * (sine(880, t) * 0.5 + sine(1320, t) * 0.2)
  }
  writeWav('your_turn.wav', s)
}

// game_win.wav — triumphant ascending fanfare
function makeGameWin() {
  const notes = [523, 659, 784, 1047] // C E G C (octave)
  const noteDur = 0.16
  const dur = notes.length * noteDur + 0.4
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  notes.forEach((freq, idx) => {
    const start = idx * noteDur
    const len = (idx === notes.length - 1) ? 0.5 : noteDur * 1.6
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE - start
      if (t < 0 || t > len) continue
      const e = Math.exp(-t * 5)
      s[i] += e * (sine(freq, t) * 0.4 + sine(freq * 2, t) * 0.1 + sine(freq * 3, t) * 0.05)
    }
  })
  writeWav('game_win.wav', s)
}

// game_lose.wav — sad descending phrase
function makeGameLose() {
  const notes = [523, 494, 440, 392] // C B A G descending
  const noteDur = 0.18
  const dur = notes.length * noteDur + 0.3
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  notes.forEach((freq, idx) => {
    const start = idx * noteDur
    const len = noteDur * 1.5
    for (let i = 0; i < n; i++) {
      const t = i / SAMPLE_RATE - start
      if (t < 0 || t > len) continue
      const e = Math.exp(-t * 6)
      s[i] += e * sine(freq, t) * 0.4
    }
  })
  writeWav('game_lose.wav', s)
}

// button_tap.wav — very short soft click
function makeButtonTap() {
  const dur = 0.08
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    s[i] = Math.exp(-t * 120) * (noise() * 0.3 + sine(600, t) * 0.2)
  }
  writeWav('button_tap.wav', s)
}

// swap7.wav — magical shimmer trill
function makeSwap7() {
  const dur = 0.4
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const e = Math.exp(-t * 5)
    const freq = 880 + Math.sin(2 * Math.PI * 18 * t) * 220
    s[i] = e * (sine(freq, t) * 0.35 + sine(freq * 1.5, t) * 0.15)
  }
  writeWav('swap7.wav', s)
}

// ambient_loop.wav — gentle tavern hum (3 seconds, designed to loop)
function makeAmbient() {
  const dur = 3.0
  const n = Math.round(SAMPLE_RATE * dur)
  const s = new Float32Array(n)
  // multiple detuned low tones + subtle noise bed
  const voices = [
    { freq: 55, amp: 0.07 },
    { freq: 55.3, amp: 0.06 },
    { freq: 82.4, amp: 0.05 },
    { freq: 110, amp: 0.04 },
  ]
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    let v = 0
    for (const { freq, amp } of voices) v += sine(freq, t) * amp
    // slow LFO swell for breathing feel
    const lfo = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.2 * t)
    // very subtle noise
    v += noise() * 0.01
    s[i] = v * lfo
  }
  // Crossfade loop ends so it loops seamlessly
  const fadeLen = Math.round(SAMPLE_RATE * 0.05)
  for (let i = 0; i < fadeLen; i++) {
    const f = i / fadeLen
    s[i] = s[i] * f + s[n - fadeLen + i] * (1 - f)
  }
  for (let i = 0; i < fadeLen; i++) {
    const f = i / fadeLen
    s[n - fadeLen + i] = s[n - fadeLen + i] * (1 - f) + s[i] * f
  }
  writeWav('ambient_loop.wav', s)
}

// ── Run all ───────────────────────────────────────────────────────────────────
console.log('Generating sounds...')
makeCardPlay()
makeCardDraw()
makeTrickWin()
makeTrickLose()
makeYourTurn()
makeGameWin()
makeGameLose()
makeButtonTap()
makeSwap7()
makeAmbient()
console.log('Done.')
