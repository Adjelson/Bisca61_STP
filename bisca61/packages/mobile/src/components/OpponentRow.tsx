import { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { CardView, CardBack } from './CardView'
import type { Card, TablePlay, RoomPlayer } from '../types'
import { AVATAR_COLORS, THEME } from '../constants/config'

interface Props {
  opponents:          number[]
  allHands:           Record<number, Card[]>   // always empty for opponents (hidden)
  handCounts:         Record<number, number>
  lastDrawn:          Record<number, Card | null>
  currentTurnUserId:  number
  table:              TablePlay[]
  trumpSuit:          string
  players?:           RoomPlayer[]
}

// One card slot that briefly flips face-up when drawnCard is set, then back down
function DrawnReveal({ drawnCard, size }: { drawnCard: Card | null; size: 'small' | 'normal' }) {
  const flipAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (drawnCard) {
      // Flip face-up then back down after 1.4 s
      Animated.sequence([
        Animated.timing(flipAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(flipAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    } else {
      flipAnim.setValue(0)
    }
  }, [drawnCard])

  // Simulate card-flip via scaleX: 1 → 0 → 1 with face swap at midpoint
  // We approximate with opacity cross-fade (scaleX distorts layout on RN)
  const faceOpacity = flipAnim.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0, 0, 1, 1] })
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [1, 1, 0, 0] })
  const scale = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.92, 1] })

  return (
    <View style={dr.wrapper}>
      {/* Back face (always rendered, fades out during reveal) */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backOpacity, transform: [{ scale }] }]}>
        <CardBack size={size} />
      </Animated.View>
      {/* Front face (fades in during reveal) */}
      {drawnCard && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: faceOpacity, transform: [{ scale }] }]}>
          <CardView card={drawnCard} size={size} />
        </Animated.View>
      )}
    </View>
  )
}

const dr = StyleSheet.create({
  wrapper: { position: 'relative' },
})

export function OpponentRow({
  opponents, handCounts, lastDrawn,
  currentTurnUserId, table, trumpSuit, players,
}: Props) {
  return (
    <View style={s.wrapper}>
      {opponents.map((uid, idx) => {
        const count    = handCounts[uid] ?? 0
        const isActive = uid === currentTurnUserId
        const played   = table.find(p => p.userId === uid)
        const drawn    = lastDrawn[uid] ?? null
        const color    = AVATAR_COLORS[idx % AVATAR_COLORS.length] ?? '#888'
        const name     = players?.find(p => p.userId === uid)?.username ?? `J${uid}`

        return (
          <View key={uid} style={[s.player, isActive && s.playerActive]}>
            {/* Avatar + nome + indicador de turno */}
            <View style={s.playerInfo}>
              <View style={[s.avatarWrap, isActive && s.avatarActive]}>
                <View style={[s.avatar, { backgroundColor: color }]}>
                  <Text style={s.avatarTxt}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              </View>
              <View style={s.nameCol}>
                <Text style={[s.name, isActive && s.nameActive]} numberOfLines={1}>{name}</Text>
                <Text style={s.countLabel}>{count} carta{count !== 1 ? 's' : ''}</Text>
              </View>
              {isActive && (
                <View style={s.turnPill}>
                  <Text style={s.turnPillText}>vez</Text>
                </View>
              )}
            </View>

            {/* Cartas face-down em leque compacto */}
            <View style={s.handZone}>
              {count === 0 ? (
                <Text style={s.emptyHand}>—</Text>
              ) : (
                <View style={s.faceDownRow}>
                  {Array.from({ length: count }, (_, i) => (
                    <View
                      key={i}
                      style={[s.faceDownCard, i > 0 && s.faceDownOverlap, { zIndex: i }]}
                    >
                      <CardBack size="small" />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Carta comprada — revelação breve + indicador */}
            {drawn && (
              <View style={s.drawnZone}>
                <Text style={s.drawnLabel}>Comprou</Text>
                <DrawnReveal drawnCard={drawn} size="small" />
              </View>
            )}

            {/* Carta jogada nesta onda */}
            {played && (
              <View style={s.playedZone}>
                <Text style={s.playedLabel}>Jogou</Text>
                <CardView card={played.card} size="small" glow={played.card.s === trumpSuit} />
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  wrapper:       { paddingHorizontal: 10, paddingVertical: 6, gap: 6 },

  player: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.surface, borderRadius: 12,
    padding: 8, gap: 8,
    borderWidth: 1, borderColor: THEME.border,
  },
  playerActive: { borderColor: THEME.green, backgroundColor: THEME.greenL },

  // Avatar block
  playerInfo:  { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 90 },
  avatarWrap:  { borderRadius: 16, padding: 2 },
  avatarActive:{ backgroundColor: THEME.green, borderRadius: 16 },
  avatar:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { color: '#fff', fontSize: 12, fontWeight: '800' },
  nameCol:     { flex: 1 },
  name:        { color: THEME.text, fontSize: 12, fontWeight: '600' },
  nameActive:  { color: THEME.green, fontWeight: '800' },
  countLabel:  { color: THEME.textMute, fontSize: 10 },
  turnPill:    { backgroundColor: THEME.green, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  turnPillText:{ color: '#fff', fontSize: 9, fontWeight: '800' },

  // Hand (face-down)
  handZone:       { flex: 1, flexDirection: 'row', alignItems: 'center' },
  faceDownRow:    { flexDirection: 'row', alignItems: 'center' },
  faceDownCard:   {},
  faceDownOverlap:{ marginLeft: -20 },
  emptyHand:      { color: THEME.textMute, fontSize: 12 },

  // Drawn reveal
  drawnZone:   { alignItems: 'center', gap: 2 },
  drawnLabel:  { fontSize: 9, color: THEME.gold, fontWeight: '700', textTransform: 'uppercase' },

  // Played card
  playedZone:  { alignItems: 'center', gap: 2 },
  playedLabel: { fontSize: 9, color: THEME.green, fontWeight: '700', textTransform: 'uppercase' },
})
