import { View, Text, StyleSheet } from 'react-native'
import { CardView, CardBack } from './CardView'
import type { Card, Suit } from '../types'
import { SUIT_SYMBOLS, THEME } from '../constants/config'

interface Props {
  trumpCard:       Card | null
  trumpHorizontal: Card | null
  trumpSuit:       Suit
  trumpRotation:   Suit[]
  trumpIdx:        number
  deckCount:       number
  isLastTrump?:    boolean
}

export function TrumpArea({ trumpCard, trumpHorizontal, trumpSuit, trumpRotation, trumpIdx, deckCount, isLastTrump }: Props) {
  const nextSuit = trumpRotation[(trumpIdx + 1) % trumpRotation.length]
  const symbol   = SUIT_SYMBOLS[trumpSuit] ?? '?'
  const nextSym  = SUIT_SYMBOLS[nextSuit ?? trumpSuit] ?? '?'
  const isRedTrump = trumpSuit === 'C' || trumpSuit === 'O'

  return (
    <View style={s.container}>
      {/* Indicador do trunfo atual */}
      <View style={[s.trumpBadge, isLastTrump && s.trumpBadgeLast]}>
        <Text style={[s.trumpSymbol, isRedTrump && s.red]}>{symbol}</Text>
        <Text style={s.trumpLabel}>{isLastTrump ? 'ÚLTIMO' : 'TRUNFO'}</Text>
      </View>

      {/* Próximo trunfo */}
      {nextSuit && nextSuit !== trumpSuit && (
        <View style={s.nextBadge}>
          <Text style={s.nextLabel}>próx.</Text>
          <Text style={s.nextSymbol}>{nextSym}</Text>
        </View>
      )}

      {/* Carta de trunfo visível + monte */}
      <View style={s.deckArea}>
        {/* Monte */}
        <View style={s.deckStack}>
          {deckCount > 0 ? <CardBack size="small" /> : <View style={s.emptyDeck} />}
          <View style={s.deckCountBadge}>
            <Text style={s.deckCount}>{deckCount}</Text>
          </View>
        </View>

        {/* Carta horizontal (7 trocado) */}
        {trumpHorizontal && (
          <View style={s.horizontalCard}>
            <CardView card={trumpHorizontal} size="small" horizontal />
          </View>
        )}

        {/* Carta de trunfo visível */}
        {trumpCard && (
          <CardView card={trumpCard} size="small" glow />
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container:     { alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  trumpBadge:     { backgroundColor: THEME.green, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 52 },
  trumpBadgeLast: { backgroundColor: THEME.gold },
  trumpSymbol:   { fontSize: 22, color: '#fff', lineHeight: 26 },
  red:           { color: '#fca5a5' },
  trumpLabel:    { fontSize: 7, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1 },
  nextBadge:     { backgroundColor: THEME.greenL, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  nextLabel:     { fontSize: 7, color: THEME.green, fontWeight: '600' },
  nextSymbol:    { fontSize: 13, color: THEME.green },
  deckArea:      { alignItems: 'center', gap: 4 },
  deckStack:     { position: 'relative' },
  deckCountBadge:{ position: 'absolute', bottom: -6, right: -6, backgroundColor: THEME.text, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  deckCount:     { color: '#fff', fontSize: 9, fontWeight: '700' },
  emptyDeck:     { width: 38, height: 56, borderRadius: 6, borderWidth: 1, borderColor: THEME.border, borderStyle: 'dashed' },
  horizontalCard:{ marginTop: -16 },
})
