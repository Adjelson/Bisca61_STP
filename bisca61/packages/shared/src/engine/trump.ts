import { SUITS, type Suit } from '../types/card'

export function buildTrumpRotation(startingSuit: Suit): Suit[] {
  const others = [...SUITS].filter(s => s !== startingSuit)
  // shuffle the other 3
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j]!, others[i]!] as [Suit, Suit]
  }
  return [startingSuit, ...others]
}

export function nextTrump(rotation: Suit[], idx: number): { suit: Suit; idx: number } {
  const newIdx = (idx + 1) % rotation.length
  return { suit: rotation[newIdx]!, idx: newIdx }
}
