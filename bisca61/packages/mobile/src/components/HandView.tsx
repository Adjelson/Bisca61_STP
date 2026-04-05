import { useState, useRef, useEffect } from 'react'
import { View, StyleSheet, useWindowDimensions, Animated } from 'react-native'
import { CardView } from './CardView'
import type { Card, Suit } from '../types'
import { THEME } from '../constants/config'

interface Props {
  hand:        Card[]
  playable:    boolean
  trumpSuit:   Suit
  lastDrawn?:  Card | null   // own drawn card — triggers slide-in animation
  onPlayCard:  (card: Card) => void
}

const CARD_W    = 64
const MAX_ANGLE = 22

// Tracks the previous hand length to detect a new draw
function usePrevCount(val: number) {
  const ref = useRef(val)
  useEffect(() => { ref.current = val })
  return ref.current
}

export function HandView({ hand, playable, onPlayCard, lastDrawn }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const { width } = useWindowDimensions()

  // Slide-in animation for newly drawn card
  const slideAnim = useRef(new Animated.Value(0)).current
  const prevCount = usePrevCount(hand.length)

  useEffect(() => {
    // Trigger when hand grows (draw) or lastDrawn changes
    if (hand.length > prevCount || lastDrawn) {
      slideAnim.setValue(1)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start()
    }
  }, [hand.length, lastDrawn])

  const count     = hand.length
  const available = width - 48
  const idealW    = count * CARD_W + (count - 1) * 4
  const marginLeft = count > 1 && idealW > available
    ? -Math.ceil((idealW - available) / (count - 1))
    : 4

  function getAngle(i: number): number {
    if (count <= 1) return 0
    const spread = Math.min(MAX_ANGLE, count * 4.5)
    return -spread / 2 + (spread / (count - 1)) * i
  }

  function handlePress(card: Card, idx: number) {
    if (!playable) return
    if (selectedIdx === idx) {
      setSelectedIdx(null)
      onPlayCard(card)
    } else {
      setSelectedIdx(idx)
    }
  }

  const newCardIdx = hand.length - 1  // drawn card is always appended last

  return (
    <View style={s.container}>
      <View style={s.fan}>
        {hand.map((card, i) => {
          const angle  = getAngle(i)
          const arcY   = Math.abs(angle) * 1.4
          const isSel  = selectedIdx === i
          const isNew  = i === newCardIdx && !!lastDrawn

          const slideY = isNew
            ? slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] })
            : undefined
          const slideO = isNew
            ? slideAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1, 0] })
            : undefined

          return (
            // Outer: slide-in + opacity for newly drawn card
            <Animated.View
              key={`${card.r}${card.s}${i}`}
              style={[
                s.cardWrap,
                i > 0 && { marginLeft },
                { zIndex: isSel ? 50 : i + 1 },
                isNew && slideY !== undefined && { transform: [{ translateY: slideY }] },
                isNew && slideO !== undefined && { opacity: slideO },
              ]}
            >
              {/* Inner: fan rotation + arc */}
              <Animated.View style={{ transform: [{ rotate: `${angle}deg` }, { translateY: arcY }] }}>
                <CardView
                  card={card}
                  size="fan"
                  selected={isSel}
                  playable={playable}
                  onPress={() => handlePress(card, i)}
                />
              </Animated.View>
            </Animated.View>
          )
        })}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingBottom: 20,
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    alignItems: 'center',
  },
  fan:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  cardWrap: {},
})
