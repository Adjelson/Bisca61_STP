import { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Platform, Animated } from 'react-native'
import { CardView } from './CardView'
import type { TablePlay } from '../types'
import { THEME } from '../constants/config'

interface Props {
  table:             TablePlay[]
  playerIds:         number[]
  currentTurnUserId: number
  myUserId:          number
  trumpSuit:         string
}

function findWinner(plays: TablePlay[], trumpSuit: string): number | null {
  if (!plays.length) return null
  const lead = plays[0]!.card.s
  let winner = plays[0]!
  for (let i = 1; i < plays.length; i++) {
    const p = plays[i]!
    const wIsRed = winner.card.s === 'C' || winner.card.s === 'O'
    const pIsRed = p.card.s === 'C' || p.card.s === 'O'
    // trunfo bate tudo
    if (p.card.s === trumpSuit && winner.card.s !== trumpSuit) { winner = p; continue }
    if (winner.card.s === trumpSuit && p.card.s !== trumpSuit) continue
    // mesmo naipe: compare força (simplificado — o engine faz o definitivo)
    if (p.card.s === winner.card.s) {
      const STRENGTH = (wIsRed || pIsRed)
        ? { A: 10, '5': 9, K: 8, J: 7, Q: 6, '2': 5, '3': 4, '4': 3, '6': 2, '7': 1 }
        : { A: 10, '5': 9, K: 8, J: 7, Q: 6, '7': 5, '6': 4, '4': 3, '3': 2, '2': 1 }
      const s = STRENGTH as Record<string, number>
      if ((s[p.card.r] ?? 0) > (s[winner.card.r] ?? 0)) winner = p
    }
    // naipe diferente, nem trunfo → lead mantém
    if (p.card.s !== lead && p.card.s !== trumpSuit) continue
  }
  return winner.userId
}

function AnimatedTableCard({ play, isWinning, isMe }: { play: TablePlay; isWinning: boolean; isMe: boolean }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(anim, {
      toValue:         1,
      useNativeDriver: true,
      tension:         70,
      friction:        8,
    }).start()
  }, [])

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] })
  const scale      = anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] })

  return (
    <Animated.View style={[s.playSlot, isWinning && s.winSlot, { transform: [{ translateY }, { scale }], opacity: anim }]}>
      <CardView card={play.card} size="table" glow={isWinning} />
      {isMe && <Text style={s.meLabel}>Tu</Text>}
    </Animated.View>
  )
}

const SHADOW = Platform.select({
  web:     { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } as object,
  default: { elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
})

export function TableView({ table, trumpSuit, myUserId }: Props) {
  const winnerId = findWinner(table, trumpSuit)

  return (
    <View style={s.container}>
      {table.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🂠</Text>
          <Text style={s.emptyText}>Mesa vazia</Text>
        </View>
      ) : (
        <View style={s.cards}>
          {table.map((play) => {
            const isWinning = play.userId === winnerId && table.length > 1
            const isMe      = play.userId === myUserId
            return (
              <AnimatedTableCard key={play.userId} play={play} isWinning={isWinning} isMe={isMe} />
            )
          })}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  empty:     { alignItems: 'center', gap: 4, opacity: 0.35 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 12, color: THEME.textMute },
  cards:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'flex-end' },
  playSlot:  { alignItems: 'center', gap: 3, borderRadius: 10, padding: 4 },
  winSlot:   { backgroundColor: THEME.goldL, ...(SHADOW as object) },
  meLabel:   { fontSize: 9, color: THEME.green, fontWeight: '700' },
})
