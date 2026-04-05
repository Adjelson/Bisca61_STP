import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, Modal, Alert,
  TouchableOpacity, useWindowDimensions, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useGameSocket } from '../hooks/useGameSocket'
import { mapError } from '../utils/errors'
import { ScoreBar }    from '../components/ScoreBar'
import { TrumpArea }   from '../components/TrumpArea'
import { TableView }   from '../components/TableView'
import { HandView }    from '../components/HandView'
import { OpponentRow } from '../components/OpponentRow'
import { THEME } from '../constants/config'
import type { Card, GameSummary } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>

export default function PlayScreen({ route, navigation }: Props) {
  const { code } = route.params
  const { width, height } = useWindowDimensions()
  const landscape = width > height

  const { userId } = useAuthStore()
  const gameState  = useGameStore(s => s.gameState)
  const room       = useGameStore(s => s.room)
  const isMyTurn   = useGameStore(s => s.isMyTurn)

  const [summary,  setSummary]  = useState<GameSummary | null>(null)
  const [playing,  setPlaying]  = useState(false)
  const [paused,   setPaused]   = useState(false)
  const [gameErr,  setGameErr]  = useState<string | null>(null)

  // Animate the turn banner when it becomes your turn
  const turnAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (isMyTurn) {
      Animated.sequence([
        Animated.timing(turnAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(turnAnim, { toValue: 0.85, duration: 120, useNativeDriver: true }),
        Animated.timing(turnAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.timing(turnAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [isMyTurn])

  const { playCard, swap7 } = useGameSocket({
    code,
    onGameEnded: (s) => setSummary(s),
    onError: (msg) => setGameErr(mapError(msg)),
  })

  const handlePlay = useCallback(async (card: Card) => {
    if (!isMyTurn || playing || paused) return
    setPlaying(true)
    setGameErr(null)
    const err = await playCard(card)
    setPlaying(false)
    if (err) setGameErr(mapError(err))
  }, [isMyTurn, playing, paused, playCard])

  const handleSwap = useCallback(async () => {
    if (paused) return
    setGameErr(null)
    const err = await swap7()
    if (err) setGameErr(mapError(err))
  }, [paused, swap7])

  function confirmLeave() {
    setPaused(false)
    Alert.alert(
      'Sair da partida',
      'Tens a certeza? A partida continuará sem ti.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => navigation.replace('Lobby') },
      ],
    )
  }

  if (!gameState) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.loading}>A carregar jogo...</Text>
      </SafeAreaView>
    )
  }

  const myTeam       = gameState.teams[0].includes(userId!) ? 0 : 1
  const opponents    = gameState.playerIds.filter(id => id !== userId)

  // Swap 7: disponível para QUALQUER jogador quando:
  //   • é a sua vez
  //   • a carta de trunfo está visível (trumpCard != null)
  //   • tem o 7 do naipe de trunfo atual na mão
  //   • o jogo não está em pausa
  const canSwap = isMyTurn
    && !paused
    && gameState.trumpCard !== null
    && gameState.hand.some(c => c.r === '7' && c.s === gameState.trumpSuit)

  // "Last trump" = deck is empty (no more draws — endgame)
  const isLastTrump  = gameState.deckCount === 0

  // Name of the current active player (for "waiting" state)
  const currentPlayerId = gameState.playerIds[gameState.currentTurn] ?? -1
  const currentPlayerName = room?.players.find(p => p.userId === currentPlayerId)?.username
    ?? `J${currentPlayerId}`

  // Turn banner scale animation
  const bannerScale = turnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] })

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* ── Barra de pontuação ── */}
      <ScoreBar
        points={gameState.points}
        tricks={gameState.tricks}
        myTeam={myTeam}
        ondaNumber={gameState.trickNumber}
      />

      {/* ── Cabeçalho: código da sala + botões com etiquetas ── */}
      <View style={s.header}>
        <Text style={s.roomCode}>{code}</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.pauseBtn} onPress={() => setPaused(true)}>
            <Text style={s.pauseBtnIcon}>⏸</Text>
            <Text style={s.pauseBtnLabel}>Pausa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.exitBtn} onPress={confirmLeave}>
            <Text style={s.exitBtnIcon}>←</Text>
            <Text style={s.exitBtnLabel}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Indicador de turno (sempre visível, proeminente) ── */}
      {isMyTurn ? (
        <Animated.View style={[s.turnBannerMine, { transform: [{ scale: bannerScale }] }]}>
          <Text style={s.turnBannerDot}>●</Text>
          <Text style={s.turnBannerTextMine}>A tua vez — seleciona uma carta</Text>
        </Animated.View>
      ) : (
        <View style={s.turnBannerWait}>
          <Text style={s.turnBannerDotWait}>○</Text>
          <Text style={s.turnBannerTextWait}>Vez de {currentPlayerName}...</Text>
        </View>
      )}

      {/* ── Último trunfo ── */}
      {isLastTrump && (
        <View style={s.lastTrumpBanner}>
          <Text style={s.lastTrumpText}>⚠  Último trunfo — sem mais compras</Text>
        </View>
      )}

      {/* ── Erro inline ── */}
      {gameErr && (
        <TouchableOpacity style={s.errBanner} onPress={() => setGameErr(null)}>
          <Text style={s.errText}>⚠  {gameErr}   (toca para fechar)</Text>
        </TouchableOpacity>
      )}

      {/* ── Adversários (cartas face-down + reveal ao comprar) ── */}
      <OpponentRow
        opponents={opponents}
        allHands={gameState.allHands}
        handCounts={gameState.handCounts}
        lastDrawn={gameState.lastDrawn}
        currentTurnUserId={currentPlayerId}
        table={gameState.table}
        trumpSuit={gameState.trumpSuit}
        players={room?.players}
      />

      {/* ── Mesa central + Trunfo ── */}
      <View style={[s.center, landscape && s.centerLandscape]}>
        <TrumpArea
          trumpCard={gameState.trumpCard}
          trumpHorizontal={gameState.trumpHorizontal}
          trumpSuit={gameState.trumpSuit}
          trumpRotation={gameState.trumpRotation}
          trumpIdx={gameState.trumpIdx}
          deckCount={gameState.deckCount}
          isLastTrump={isLastTrump}
        />
        <TableView
          table={gameState.table}
          playerIds={gameState.playerIds}
          currentTurnUserId={currentPlayerId}
          myUserId={userId!}
          trumpSuit={gameState.trumpSuit}
        />
      </View>

      {/* ── Botão Trocar 7 ── */}
      {canSwap && (
        <TouchableOpacity style={s.swapBtn} onPress={handleSwap}>
          <Text style={s.swapText}>⇄  Trocar 7 de Trunfo</Text>
        </TouchableOpacity>
      )}

      {/* ── Mão do jogador (leque) ── */}
      <HandView
        hand={gameState.hand}
        playable={isMyTurn && !playing && !paused}
        trumpSuit={gameState.trumpSuit}
        onPlayCard={handlePlay}
      />

      {/* ── MODAL: Fim de jogo ── */}
      <Modal visible={!!summary} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            {summary && (
              <>
                <Text style={s.modalTitle}>
                  {summary.winnerTeam === -1
                    ? 'Empate!'
                    : summary.winnerTeam === myTeam
                      ? '🏆 Vitória!'
                      : '😔 Derrota'}
                </Text>
                <View style={s.scoreRow}>
                  <View style={s.scoreCol}>
                    <Text style={s.scoreLabel}>Nós</Text>
                    <Text style={[s.scorePts, summary.winnerTeam === myTeam && s.ptWinner]}>
                      {summary.points[myTeam]}
                    </Text>
                    <Text style={s.scoreSub}>{summary.tricks[myTeam]} ondas</Text>
                  </View>
                  <Text style={s.scoreSep}>—</Text>
                  <View style={s.scoreCol}>
                    <Text style={s.scoreLabel}>Adv</Text>
                    <Text style={[s.scorePts, summary.winnerTeam !== myTeam && summary.winnerTeam !== -1 && s.ptWinner]}>
                      {summary.points[myTeam === 0 ? 1 : 0]}
                    </Text>
                    <Text style={s.scoreSub}>{summary.tricks[myTeam === 0 ? 1 : 0]} ondas</Text>
                  </View>
                </View>
              </>
            )}
            <TouchableOpacity style={s.modalBtn} onPress={() => { setSummary(null); navigation.replace('Lobby') }}>
              <Text style={s.modalBtnText}>Voltar ao Lobby</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Menu de pausa ── */}
      <Modal visible={paused} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.pauseTitle}>⏸  Pausa</Text>
            <Text style={s.pauseSub}>O jogo continua no servidor enquanto estás em pausa.</Text>

            <TouchableOpacity style={s.modalBtn} onPress={() => setPaused(false)}>
              <Text style={s.modalBtnText}>▶  Continuar a jogar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.modalBtn, s.leaveModalBtn]} onPress={confirmLeave}>
              <Text style={s.modalBtnText}>← Sair da Partida</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: THEME.bg },
  loading:         { color: THEME.textSoft, textAlign: 'center', marginTop: 100, fontSize: 16 },

  // ── Cabeçalho ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: THEME.bg, borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  roomCode:    { color: THEME.textMute, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  headerBtns:  { flexDirection: 'row', gap: 8 },

  pauseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: THEME.surface, borderRadius: 8,
    borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  pauseBtnIcon:  { fontSize: 13 },
  pauseBtnLabel: { fontSize: 12, fontWeight: '700', color: THEME.text },

  exitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF2F2', borderRadius: 8,
    borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 12, paddingVertical: 7,
  },
  exitBtnIcon:  { fontSize: 13, color: THEME.red },
  exitBtnLabel: { fontSize: 12, fontWeight: '700', color: THEME.red },

  // ── Indicador de turno ──
  turnBannerMine: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.green,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  turnBannerDot:      { color: '#ffffff', fontSize: 8 },
  turnBannerTextMine: { color: '#ffffff', fontSize: 14, fontWeight: '800', flex: 1 },

  turnBannerWait: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.surface,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  turnBannerDotWait:  { color: THEME.textMute, fontSize: 8 },
  turnBannerTextWait: { color: THEME.textSoft, fontSize: 13, fontWeight: '500', fontStyle: 'italic', flex: 1 },

  // ── Último trunfo ──
  lastTrumpBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    flexDirection: 'row', alignItems: 'center',
  },
  lastTrumpText: { color: '#92400E', fontSize: 12, fontWeight: '700', flex: 1 },

  // ── Erro ──
  errBanner: {
    backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 7,
    borderLeftWidth: 3, borderLeftColor: THEME.red,
  },
  errText: { color: THEME.red, fontSize: 12, fontWeight: '500' },

  // ── Centro ──
  center:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, backgroundColor: THEME.surface },
  centerLandscape: { paddingHorizontal: 32 },

  // ── Swap 7 ──
  swapBtn:  { alignSelf: 'center', backgroundColor: THEME.gold, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9, marginVertical: 4 },
  swapText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Modais ──
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    backgroundColor: THEME.bg, borderRadius: 20, padding: 28,
    alignItems: 'center', width: '84%', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalBtn:      { backgroundColor: THEME.green, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  leaveModalBtn: { backgroundColor: THEME.red },
  modalBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Fim de jogo ──
  modalTitle: { color: THEME.text, fontSize: 26, fontWeight: '800' },
  scoreRow:   { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreCol:   { alignItems: 'center', gap: 2 },
  scoreLabel: { color: THEME.textMute, fontSize: 12, fontWeight: '600' },
  scorePts:   { color: THEME.text, fontSize: 46, fontWeight: '900' },
  ptWinner:   { color: THEME.green },
  scoreSub:   { color: THEME.textMute, fontSize: 11 },
  scoreSep:   { color: THEME.border, fontSize: 24 },

  // ── Pausa ──
  pauseTitle: { color: THEME.text, fontSize: 22, fontWeight: '800' },
  pauseSub:   { color: THEME.textMute, fontSize: 13, textAlign: 'center', marginTop: -6 },
})
