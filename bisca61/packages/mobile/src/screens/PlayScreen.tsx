import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, Modal, Alert,
  TouchableOpacity, useWindowDimensions, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useGameSocket } from '../hooks/useGameSocket'
import { useSounds } from '../hooks/useSounds'
import { mapError } from '../utils/errors'
import { ScoreBar }    from '../components/ScoreBar'
import { TrumpArea }   from '../components/TrumpArea'
import { TableView }   from '../components/TableView'
import { HandView }    from '../components/HandView'
import { OpponentRow } from '../components/OpponentRow'
import { CardView } from '../components/CardView'
import { THEME } from '../constants/config'
import type { Card, GameSummary, AbandonedInfo, TrickHistory } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Play'>

const TURN_LIMIT_MS = 30_000

export default function PlayScreen({ route, navigation }: Props) {
  const { code } = route.params
  const { width, height } = useWindowDimensions()
  const landscape = width > height

  const { userId } = useAuthStore()
  const gameState  = useGameStore(s => s.gameState)
  const room       = useGameStore(s => s.room)
  const isMyTurn   = useGameStore(s => s.isMyTurn)
  const resetGame  = useGameStore(s => s.reset)

  const [summary,          setSummary]         = useState<GameSummary | null>(null)
  const [abandoned,        setAbandoned]        = useState<AbandonedInfo | null>(null)
  const [opponentPausedId, setOpponentPausedId] = useState<number | null>(null)
  const [playing,          setPlaying]          = useState(false)
  const [paused,           setPaused]           = useState(false)
  const [gameErr,          setGameErr]          = useState<string | null>(null)
  const [muted,            setMutedState]       = useState(false)
  const [timeLeft,         setTimeLeft]         = useState(30)
  const [pendingTrick,     setPendingTrick]     = useState<TrickHistory | null>(null)
  const [trickSecsLeft,    setTrickSecsLeft]    = useState(15)

  // ── Sounds ────────────────────────────────────────────────────────────────
  const {
    playCardPlay, playTrickWin, playTrickLose,
    playYourTurn, playGameWin, playGameLose,
    playButtonTap, playSwap7,
    setMuted,
  } = useSounds()

  function toggleMute() {
    const next = !muted
    setMutedState(next)
    setMuted(next)
  }

  // ── Turn banner animation ─────────────────────────────────────────────────
  const turnAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (isMyTurn) {
      Animated.sequence([
        Animated.timing(turnAnim, { toValue: 1,    duration: 180, useNativeDriver: true }),
        Animated.timing(turnAnim, { toValue: 0.85, duration: 120, useNativeDriver: true }),
        Animated.timing(turnAnim, { toValue: 1,    duration: 80,  useNativeDriver: true }),
      ]).start()
    } else {
      Animated.timing(turnAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [isMyTurn])

  // ── Your-turn ping ────────────────────────────────────────────────────────
  const prevIsMyTurn = useRef(false)
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurn.current) void playYourTurn()
    prevIsMyTurn.current = isMyTurn
  }, [isMyTurn])

  // ── Trick sound ───────────────────────────────────────────────────────────
  const prevTrickNumber = useRef<number>(-1)
  useEffect(() => {
    if (!gameState) return
    const tn = gameState.trickNumber
    if (tn > prevTrickNumber.current && prevTrickNumber.current >= 0 && gameState.lastTrick) {
      const myTeamLocal = gameState.teams[0].includes(userId!) ? 0 : 1
      const winnerTeam  = gameState.teams[0].includes(gameState.lastTrick.winnerUserId) ? 0 : 1
      if (winnerTeam === myTeamLocal) void playTrickWin()
      else                            void playTrickLose()
    }
    prevTrickNumber.current = tn
  }, [gameState?.trickNumber])

  // ── 15-second trick display ───────────────────────────────────────────────
  const prevTrickForDisplay = useRef(-1)
  useEffect(() => {
    if (!gameState) return
    const tn  = gameState.trickNumber
    const prev = prevTrickForDisplay.current
    prevTrickForDisplay.current = tn

    if (tn > prev && tn > 0 && gameState.lastTrick) {
      setPendingTrick(gameState.lastTrick)
      setTrickSecsLeft(3)
      const start = Date.now()
      const iv = setInterval(() => {
        const rem = Math.max(0, 3000 - (Date.now() - start))
        setTrickSecsLeft(Math.ceil(rem / 1000))
        if (rem <= 0) { clearInterval(iv); setPendingTrick(null) }
      }, 200)
      return () => clearInterval(iv)
    }
  }, [gameState?.trickNumber])

  // ── 30-second turn timer ──────────────────────────────────────────────────
  const timerAnim  = useRef(new Animated.Value(1)).current
  const handlePlayRef = useRef<((card: Card) => Promise<void>) | null>(null)
  const pausedRef     = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    if (!gameState) return

    // Use server-stamped start time when available (keeps both clients in sync).
    // Fall back to Date.now() so the timer works even if the server hasn't
    // sent turnStartedAt yet (e.g. old server version still running).
    const ts = gameState.turnStartedAt ?? Date.now()

    const elapsed   = Math.max(0, Date.now() - ts)
    const remaining = Math.max(0, TURN_LIMIT_MS - elapsed)
    const fraction  = remaining / TURN_LIMIT_MS

    timerAnim.stopAnimation()
    timerAnim.setValue(fraction)
    setTimeLeft(Math.ceil(remaining / 1000))

    // Smooth bar animation
    Animated.timing(timerAnim, {
      toValue:         0,
      duration:        remaining,
      useNativeDriver: false,
    }).start()

    // Countdown tick + auto-play
    const tick = setInterval(() => {
      const r = Math.max(0, TURN_LIMIT_MS - (Date.now() - ts))
      setTimeLeft(Math.ceil(r / 1000))

      if (r <= 0) {
        clearInterval(tick)
        const { isMyTurn: imt, gameState: gs } = useGameStore.getState()
        if (imt && gs?.hand.length && !pausedRef.current && handlePlayRef.current) {
          void handlePlayRef.current(gs.hand[0]!)
        }
      }
    }, 200)

    return () => {
      clearInterval(tick)
      timerAnim.stopAnimation()
    }
  // Re-run when turn changes (currentTurn) OR when server provides a new
  // synchronised timestamp (turnStartedAt). Both are needed as fallbacks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentTurn, gameState?.turnStartedAt])

  // ── Socket ────────────────────────────────────────────────────────────────
  const { playCard, swap7, leaveGame, pauseGame, resumeGame } = useGameSocket({
    code,
    onGameEnded: (s) => {
      setSummary(s)
      const mt = gameState?.teams[0].includes(userId!) ? 0 : 1
      if (s.winnerTeam === mt)      void playGameWin()
      else if (s.winnerTeam !== -1) void playGameLose()
    },
    onGameAbandoned: (info) => {
      setAbandoned(info)
      setPaused(false)
      void playGameLose()
    },
    onOpponentPaused:  (uid) => setOpponentPausedId(uid),
    onOpponentResumed: ()    => setOpponentPausedId(null),
    onError: (msg) => setGameErr(mapError(msg)),
  })

  // ── Card play ─────────────────────────────────────────────────────────────
  const handlePlay = useCallback(async (card: Card) => {
    if (!isMyTurn || playing || paused) return
    setPlaying(true)
    setGameErr(null)
    void playCardPlay()
    const err = await playCard(card)
    setPlaying(false)
    if (err) setGameErr(mapError(err))
  }, [isMyTurn, playing, paused, playCard, playCardPlay])

  // Keep ref up-to-date for auto-play callback (avoids stale closure in setInterval)
  useEffect(() => { handlePlayRef.current = handlePlay }, [handlePlay])

  const handleSwap = useCallback(async () => {
    if (paused) return
    setGameErr(null)
    void playSwap7()
    const err = await swap7()
    if (err) setGameErr(mapError(err))
  }, [paused, swap7, playSwap7])

  // ── Pause / resume ────────────────────────────────────────────────────────
  function handlePause() {
    setPaused(true)
    pauseGame()
    void playButtonTap()
  }

  function handleResume() {
    setPaused(false)
    resumeGame()
  }

  // ── Leave paths ───────────────────────────────────────────────────────────
  // Both paths call leaveGame() explicitly so the server reacts immediately,
  // regardless of cleanup timing.
  function confirmLeave() {
    void playButtonTap()
    Alert.alert(
      'Sair da partida',
      'Tens a certeza? Isto encerrará o jogo para todos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair', style: 'destructive',
          onPress: () => { leaveGame(); resetGame(); navigation.replace('Lobby') },
        },
      ],
    )
  }

  function leaveFromPause() {
    setPaused(false)
    leaveGame()
    resetGame()
    navigation.replace('Lobby')
  }

  function goToLobby() {
    setSummary(null)
    setAbandoned(null)
    resetGame()
    navigation.replace('Lobby')
  }

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.loading}>A carregar jogo...</Text>
      </SafeAreaView>
    )
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const myTeam            = gameState.teams[0].includes(userId!) ? 0 : 1
  const opponents         = gameState.playerIds.filter(id => id !== userId)
  const currentPlayerId   = gameState.playerIds[gameState.currentTurn] ?? -1
  const currentPlayerName = room?.players.find(p => p.userId === currentPlayerId)?.username
    ?? `J${currentPlayerId}`
  const opponentPausedName = opponentPausedId !== null
    ? (room?.players.find(p => p.userId === opponentPausedId)?.username ?? 'Adversário')
    : null
  // Any player holding the 7 of trump can swap at any time (not restricted to current turn).
  // The 7 in hand AND the face-up trump card must share the same suit.
  const canSwap = !paused
    && !playing
    && gameState.trumpCard !== null
    && gameState.hand.some(c => c.r === '7' && c.s === gameState.trumpCard!.s)
  const isLastTrump    = gameState.deckCount === 0
  const bannerScale    = turnAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] })
  const timerBarWidth  = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  const timerColor     = timeLeft > 15 ? THEME.green : timeLeft > 8 ? THEME.gold : THEME.red

  // ── Score helper ──────────────────────────────────────────────────────────
  function ScoreCol({ pts, trks, label, win }: { pts: number; trks: number; label: string; win: boolean }) {
    return (
      <View style={s.scoreCol}>
        <Text style={s.scoreLabel}>{label}</Text>
        <Text style={[s.scorePts, win && s.ptWinner]}>{pts}</Text>
        <Text style={s.scoreSub}>{trks} ondas</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Score bar ── */}
      <ScoreBar
        points={gameState.points}
        tricks={gameState.tricks}
        myTeam={myTeam}
        ondaNumber={gameState.trickNumber}
      />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.roomCode}>{code}</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.hBtn} onPress={toggleMute}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-medium'} size={14} color={THEME.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity style={s.hBtn} onPress={handlePause}>
            <Ionicons name="pause" size={14} color={THEME.red} />
            <Text style={s.hBtnLabel}>Pausa</Text>
          </TouchableOpacity>
         
        </View>
      </View>

      {/* ── Turn banner ── */}
      {isMyTurn ? (
        <Animated.View style={[s.turnBannerMine, { transform: [{ scale: bannerScale }] }]}>
          <Ionicons name="radio-button-on" size={10} color="#fff" />
          <Text style={s.turnBannerTextMine}>A tua vez — seleciona uma carta</Text>
        </Animated.View>
      ) : (
        <View style={s.turnBannerWait}>
          <Ionicons name="radio-button-off" size={10} color={THEME.textMute} />
          <Text style={s.turnBannerTextWait}>Vez de {currentPlayerName}...</Text>
        </View>
      )}

      {/* ── 30-second timer bar ── */}
      <View style={s.timerRow}>
        <View style={s.timerBg}>
          <Animated.View style={[s.timerFill, { width: timerBarWidth, backgroundColor: timerColor }]} />
        </View>
        <Text style={[s.timerSecs, { color: timerColor }]}>{timeLeft}s</Text>
      </View>

      {/* ── Opponent paused banner ── */}
      {opponentPausedName && (
        <View style={s.pausedBanner}>
          <Ionicons name="pause-circle" size={14} color="#92400E" />
          <Text style={s.pausedBannerTxt}>{opponentPausedName} está em pausa</Text>
        </View>
      )}

      {/* ── Last trump banner ── */}
      {isLastTrump && (
        <View style={s.lastTrumpBanner}>
          <Ionicons name="warning-outline" size={13} color="#92400E" />
          <Text style={s.lastTrumpText}> Último trunfo — sem mais compras</Text>
        </View>
      )}

      {/* ── Inline error ── */}
      {gameErr && (
        <TouchableOpacity style={s.errBanner} onPress={() => setGameErr(null)}>
          <Text style={s.errText}>⚠  {gameErr}  (toca para fechar)</Text>
        </TouchableOpacity>
      )}

      {/* ── Opponents ── */}
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

      {/* ── Center: trump + table ── */}
      <View style={[s.center, landscape && s.centerLandscape]}>
        <TrumpArea
          trumpCard={gameState.trumpCard}
          trumpHorizontal={gameState.trumpHorizontal}
          trumpSuit={gameState.trumpSuit}
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

      {/* ── Swap 7 ── */}
      {canSwap && (
        <TouchableOpacity style={s.swapBtn} onPress={handleSwap}>
          <Text style={s.swapText}>⇄  Trocar 7 de Trunfo</Text>
        </TouchableOpacity>
      )}

      {/* ── Hand ── */}
      <HandView
        hand={gameState.hand}
        playable={isMyTurn && !playing && !paused}
        trumpSuit={gameState.trumpSuit}
        onPlayCard={handlePlay}
      />

      {/* ═══════════════════════ MODAL: Fim de jogo (normal) ═══════════════ */}
      <Modal visible={!!summary && !abandoned} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            {summary && (() => {
              const won  = summary.winnerTeam === myTeam
              const draw = summary.winnerTeam === -1
              return (
                <>
                  <Ionicons
                    name={draw ? 'remove-circle-outline' : won ? 'trophy' : 'sad-outline'}
                    size={52}
                    color={draw ? THEME.textMute : won ? THEME.gold : THEME.red}
                  />
                  <Text style={s.modalTitle}>
                    {draw ? 'Empate!' : won ? 'Vitória!' : 'Derrota'}
                  </Text>
                  <View style={s.scoreRow}>
                    <ScoreCol label="Nós" pts={summary.points[myTeam]} trks={summary.tricks[myTeam]} win={won} />
                    <Text style={s.scoreSep}>—</Text>
                    <ScoreCol label="Adv" pts={summary.points[myTeam === 0 ? 1 : 0]} trks={summary.tricks[myTeam === 0 ? 1 : 0]} win={!won && !draw} />
                  </View>
                  <TouchableOpacity style={s.modalBtn} onPress={goToLobby}>
                    <Ionicons name="grid-outline" size={16} color="#fff" />
                    <Text style={s.modalBtnText}>Voltar ao Lobby</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalBtn, s.modalBtnAlt]} onPress={goToLobby}>
                    <Ionicons name="add-circle-outline" size={16} color={THEME.green} />
                    <Text style={[s.modalBtnText, { color: THEME.green }]}>Nova Partida</Text>
                  </TouchableOpacity>
                </>
              )
            })()}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════ MODAL: Jogo abandonado ════════════════════ */}
      <Modal visible={!!abandoned} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            {abandoned && (() => {
              const leaverTeam    = gameState.teams[0].includes(abandoned.userId) ? 0 : 1
              const myAbandonTeam = gameState.teams[0].includes(userId!) ? 0 : 1
              const iWon          = leaverTeam !== myAbandonTeam

              return (
                <>
                  <Ionicons name="person-remove-outline" size={48} color={THEME.textMute} />
                  <Text style={s.modalTitle}>Jogo Encerrado</Text>
                  <Text style={s.abandonReason}>
                    <Text style={{ fontWeight: '800', color: THEME.text }}>{abandoned.username}</Text>
                    {' '}saiu da partida
                  </Text>

                  {iWon && (
                    <View style={s.wonBadge}>
                      <Ionicons name="trophy" size={15} color={THEME.gold} />
                      <Text style={s.wonBadgeTxt}>Vencedor por desistência!</Text>
                    </View>
                  )}

                  <View style={s.abandonScoreBox}>
                    <Text style={s.abandonScoreTitle}>Pontuação no momento da saída</Text>
                    <View style={s.scoreRow}>
                      <ScoreCol label="Nós" pts={abandoned.points[myAbandonTeam]} trks={abandoned.tricks[myAbandonTeam]} win={iWon} />
                      <Text style={s.scoreSep}>—</Text>
                      <ScoreCol label="Adv" pts={abandoned.points[myAbandonTeam === 0 ? 1 : 0]} trks={abandoned.tricks[myAbandonTeam === 0 ? 1 : 0]} win={!iWon} />
                    </View>
                  </View>

                  <TouchableOpacity style={s.modalBtn} onPress={goToLobby}>
                    <Ionicons name="grid-outline" size={16} color="#fff" />
                    <Text style={s.modalBtnText}>Voltar ao Lobby</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalBtn, s.modalBtnAlt]} onPress={goToLobby}>
                    <Ionicons name="add-circle-outline" size={16} color={THEME.green} />
                    <Text style={[s.modalBtnText, { color: THEME.green }]}>Nova Partida</Text>
                  </TouchableOpacity>
                </>
              )
            })()}
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════ MODAL: Pausa ══════════════════════════════ */}
      <Modal visible={paused} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <Ionicons name="pause-circle" size={52} color={THEME.textSoft} />
            <Text style={s.pauseTitle}>Pausa</Text>
            <Text style={s.pauseSub}>
              Os adversários foram notificados.{'\n'}O jogo continua no servidor.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={handleResume}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={s.modalBtnText}>Continuar a jogar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.modalBtn, s.modalBtnLeave]} onPress={leaveFromPause}>
              <Ionicons name="exit-outline" size={16} color="#fff" />
              <Text style={s.modalBtnText}>Sair da Partida</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════ OVERLAY: Cartas da vaza (15s) ════════════ */}
      {pendingTrick && !summary && !abandoned && (
        <TouchableOpacity
          style={s.trickOverlayFull}
          onPress={() => setPendingTrick(null)}
          activeOpacity={1}
        >
        
            <View style={s.trickCardsRow}>
              {pendingTrick.plays.map((play, i) => (
                <View key={i} style={s.trickCardSlot}>
                  <CardView card={play.card} size="table" glow={play.userId === pendingTrick.winnerUserId} />
                  <Text style={s.trickPlayerTxt}>
                    {play.userId === userId
                      ? 'Tu'
                      : room?.players.find(p => p.userId === play.userId)?.username ?? `J${play.userId}`}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={s.trickDismissTxt}>Toca para fechar · {trickSecsLeft}s</Text>
        
        </TouchableOpacity>
      )}

    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  loading:   { color: THEME.textSoft, textAlign: 'center', marginTop: 100, fontSize: 16 },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: THEME.bg, borderBottomWidth: 1, borderBottomColor: THEME.border },
  roomCode:   { color: THEME.textMute, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  headerBtns: { flexDirection: 'row', gap: 6 },
  hBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: THEME.surface, borderRadius: 8, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 10, paddingVertical: 7 },
  hBtnLabel:  { fontSize: 12, fontWeight: '700', color: THEME.text },
  hBtnExit:   { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },

  // Turn banners
  turnBannerMine:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.green, paddingHorizontal: 16, paddingVertical: 10 },
  turnBannerTextMine: { color: '#fff', fontSize: 14, fontWeight: '800', flex: 1 },
  turnBannerWait:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.surface, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: THEME.border },
  turnBannerTextWait: { color: THEME.textSoft, fontSize: 13, fontWeight: '500', fontStyle: 'italic', flex: 1 },

  // Timer bar
  timerRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4, gap: 8, backgroundColor: THEME.bg },
  timerBg:   { flex: 1, height: 5, backgroundColor: THEME.border, borderRadius: 3, overflow: 'hidden' },
  timerFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  timerSecs: { fontSize: 11, fontWeight: '800', minWidth: 26, textAlign: 'right' },

  // Banners
  pausedBanner:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  pausedBannerTxt: { color: '#92400E', fontSize: 12, fontWeight: '600' },
  lastTrumpBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  lastTrumpText:   { color: '#92400E', fontSize: 12, fontWeight: '700' },
  errBanner:       { backgroundColor: '#FEF2F2', paddingHorizontal: 14, paddingVertical: 7, borderLeftWidth: 3, borderLeftColor: THEME.red },
  errText:         { color: THEME.red, fontSize: 12, fontWeight: '500' },

  // Center
  center:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, backgroundColor: THEME.surface },
  centerLandscape: { paddingHorizontal: 32 },

  // Swap 7
  swapBtn:  { alignSelf: 'center', backgroundColor: THEME.gold, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9, marginVertical: 4 },
  swapText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    backgroundColor: THEME.bg, borderRadius: 22, padding: 28,
    alignItems: 'center', width: '88%', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 20, elevation: 10,
  },
  modalTitle:    { color: THEME.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  modalBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.green, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 28, width: '100%' },
  modalBtnAlt:   { backgroundColor: THEME.greenL, borderWidth: 1.5, borderColor: THEME.green },
  modalBtnLeave: { backgroundColor: THEME.red },
  modalBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Scores
  scoreRow:  { flexDirection: 'row', alignItems: 'center', gap: 24, marginVertical: 4 },
  scoreCol:  { alignItems: 'center', gap: 2 },
  scoreLabel:{ color: THEME.textMute, fontSize: 12, fontWeight: '600' },
  scorePts:  { color: THEME.text, fontSize: 46, fontWeight: '900' },
  ptWinner:  { color: THEME.green },
  scoreSub:  { color: THEME.textMute, fontSize: 11 },
  scoreSep:  { color: THEME.border, fontSize: 28 },

  // Abandoned
  abandonReason:    { color: THEME.textSoft, fontSize: 14, textAlign: 'center' },
  wonBadge:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.goldL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  wonBadgeTxt:      { color: THEME.gold, fontWeight: '700', fontSize: 13 },
  abandonScoreBox:  { backgroundColor: THEME.surface, borderRadius: 12, padding: 14, width: '100%', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: THEME.border },
  abandonScoreTitle:{ color: THEME.textMute, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },

  // Pause
  pauseTitle: { color: THEME.text, fontSize: 22, fontWeight: '800' },
  pauseSub:   { color: THEME.textMute, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Trick overlay (15-second post-trick display)
  trickOverlayFull: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  trickBox:         { backgroundColor: THEME.bg, borderRadius: 20, padding: 22, alignItems: 'center', gap: 10, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  trickWinnerTxt:   { color: THEME.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  trickPtsTxt:      { color: THEME.gold, fontSize: 14, fontWeight: '700' },
  trickCardsRow:    { flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginVertical: 4 },
  trickCardSlot:    { alignItems: 'center', gap: 4 },
  trickPlayerTxt:   { color: THEME.textMute, fontSize: 11, fontWeight: '600' },
  trickDismissTxt:  { color: THEME.textMute, fontSize: 12, marginTop: 4 },
})
