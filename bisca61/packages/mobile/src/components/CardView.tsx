import { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native'
import type { Card } from '../types'
import { SUIT_SYMBOLS, SUIT_COLORS } from '../constants/config'

const SIZES = {
  normal: { w: 56,  h: 84,  rank: 18, suit: 13, center: 28 },
  table:  { w: 56,  h: 84,  rank: 18, suit: 13, center: 28 },
  small:  { w: 38,  h: 56,  rank: 12, suit:  9, center: 18 },
  fan:    { w: 64,  h: 96,  rank: 20, suit: 14, center: 32 },
} as const

interface Props {
  card:       Card
  size?:      keyof typeof SIZES
  selected?:  boolean
  playable?:  boolean
  horizontal?: boolean
  glow?:      boolean   // carta especial em destaque (7 de trunfo, vencedora)
  faded?:     boolean   // cartas do adversário com menos destaque
  onPress?:   () => void
}

export function CardView({ card, size = 'normal', selected, playable, horizontal, glow, faded, onPress }: Props) {
  const { w, h, rank, suit, center } = SIZES[size]
  const color  = SUIT_COLORS[card.s] ?? '#111827'
  const symbol = SUIT_SYMBOLS[card.s] ?? '?'
  // Animação de lift quando selecionada
  const liftAnim = useRef(new Animated.Value(0)).current
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(liftAnim, {
      toValue: selected ? -16 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start()
  }, [selected])

  useEffect(() => {
    if (glow) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ])
      ).start()
    } else {
      glowAnim.stopAnimation()
      glowAnim.setValue(0)
    }
  }, [glow])

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })

  const inner = (
    <Animated.View style={[
      st.card,
      { width: w, height: h, opacity: faded ? 0.65 : 1 },
      horizontal && st.horizontal,
      { transform: [{ translateY: liftAnim }] },
    ]}>
      {/* Brilho da carta especial */}
      {glow && (
        <Animated.View style={[st.glowRing, { opacity: glowOpacity }]} />
      )}

      <View style={[st.face, selected && st.faceSelected, glow && st.faceGlow]}>
        {/* Canto superior esquerdo */}
        <View style={st.cornerTL}>
          <Text style={[st.rankText, { fontSize: rank, color }]}>{card.r}</Text>
          <Text style={[st.suitCorner, { fontSize: suit, color }]}>{symbol}</Text>
        </View>

        {/* Naipe central */}
        <Text style={[st.centerSuit, { fontSize: center, color }]}>{symbol}</Text>

        {/* Badge Nova Manilha */}
        {card.r === '5' && (
          <View style={st.badge}>
            <Text style={st.badgeText}>M</Text>
          </View>
        )}

        {/* Canto inferior direito (invertido) */}
        <View style={st.cornerBR}>
          <Text style={[st.rankText, { fontSize: rank, color, transform: [{ rotate: '180deg' }] }]}>{card.r}</Text>
        </View>
      </View>
    </Animated.View>
  )

  if (!onPress) return inner

  return (
    <TouchableOpacity onPress={onPress} disabled={!playable} activeOpacity={0.8}>
      {inner}
    </TouchableOpacity>
  )
}

export function CardBack({ size = 'normal' }: { size?: keyof typeof SIZES }) {
  const { w, h } = SIZES[size]
  return (
    <View style={[st.back, { width: w, height: h }]}>
      <View style={st.backPattern} />
    </View>
  )
}

const SHADOW = Platform.select({
  web:     { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } as object,
  default: { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
})

const st = StyleSheet.create({
  card:        { position: 'relative' },
  horizontal:  { transform: [{ rotate: '90deg' }] },
  face: {
    width: '100%', height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(SHADOW as object),
  },
  faceSelected: { borderColor: '#059669', borderWidth: 2 },
  faceGlow:     { borderColor: '#F59E0B', borderWidth: 2 },
  glowRing: {
    position: 'absolute',
    top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  cornerTL:   { position: 'absolute', top: 4, left: 5, alignItems: 'center' },
  cornerBR:   { position: 'absolute', bottom: 4, right: 5 },
  rankText:   { fontWeight: '800', lineHeight: 20 },
  suitCorner: { lineHeight: 12, marginTop: -2 },
  centerSuit: { position: 'absolute', alignSelf: 'center', top: '30%' },
  badge: {
    position: 'absolute', bottom: 5, alignSelf: 'center',
    backgroundColor: '#059669', borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  badgeText:  { color: '#fff', fontSize: 8, fontWeight: '800' },
  back: {
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    ...(SHADOW as object),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPattern: {
    width: '70%', height: '70%',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
})
