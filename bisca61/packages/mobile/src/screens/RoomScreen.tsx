import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useGameSocket } from '../hooks/useGameSocket'
import { AVATAR_COLORS, THEME } from '../constants/config'

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>

export default function RoomScreen({ route, navigation }: Props) {
  const { code }    = route.params
  const { userId }  = useAuthStore()
  const room        = useGameStore(s => s.room)
  const gameState   = useGameStore(s => s.gameState)
  const resetGame   = useGameStore(s => s.reset)
  const [starting, setStarting]   = useState(false)
  const [copied,   setCopied]     = useState(false)

  const { startGame } = useGameSocket({
    code,
    onGameEnded: () => {},
    onError: (msg) => Alert.alert('Erro', msg),
  })

  useEffect(() => {
    if (gameState?.phase === 'playing') navigation.replace('Play', { code })
  }, [gameState?.phase])

  async function handleStart() {
    setStarting(true)
    const err = await startGame()
    setStarting(false)
    if (err) Alert.alert('Não foi possível iniciar', err)
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Entra na minha sala de Bisca 61!\nCódigo: ${code}`,
        title: `Bisca 61 — Sala ${code}`,
      })
    } catch {}
  }

  function handleCopyFeedback() {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    void handleShare()
  }

  function handleLeave() {
    Alert.alert('Sair da Sala', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => { resetGame(); navigation.replace('Lobby') } },
    ])
  }

  const isHost  = room?.hostId === userId
  const isFull  = room ? room.players.length >= room.playerCount : false
  const missing = (room?.playerCount ?? 2) - (room?.players.length ?? 0)
  const is4     = room?.playerCount === 4

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>

      {/* ── Código da Sala ── */}
      <View style={s.codeBox}>
        <Text style={s.codeLabel}>CÓDIGO DA SALA</Text>
        <View style={s.codeRow}>
          <Text style={s.code}>{code}</Text>
          <TouchableOpacity style={[s.shareBtn, copied && s.shareBtnDone]} onPress={handleCopyFeedback} activeOpacity={0.8}>
            <Text style={s.shareBtnTxt}>{copied ? '✓  Partilhado' : '📤  Partilhar'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.modeLabel}>
          {is4 ? '👥  4 jogadores — duplas' : '👤  2 jogadores — individual'}
        </Text>
      </View>

      {/* ── Progresso ── */}
      <View style={s.progressRow}>
        {Array.from({ length: room?.playerCount ?? 2 }, (_, i) => (
          <View
            key={i}
            style={[s.progressDot, i < (room?.players.length ?? 0) ? s.progressFull : s.progressEmpty]}
          />
        ))}
        <Text style={s.progressTxt}>
          {room?.players.length ?? 0}/{room?.playerCount ?? 2} jogadores
        </Text>
      </View>

      {/* ── Slots de jogadores ── */}
      <View style={s.slots}>
        {!room && (
          <View style={s.loadingBox}>
            <ActivityIndicator color={THEME.green} size="large" />
            <Text style={s.loadingTxt}>A ligar à sala...</Text>
          </View>
        )}
        {room && Array.from({ length: room.playerCount }, (_, i) => {
          const player = room.players.find(p => p.slot === i)
          const color  = player ? AVATAR_COLORS[(player.avatar - 1) % AVATAR_COLORS.length] ?? THEME.textMute : undefined
          const isMe   = player?.userId === userId
          const isRoomHost = player?.userId === room.hostId

          return (
            <View key={i} style={[s.slot, isMe && s.slotMe]}>
              {player ? (
                <>
                  <View style={[s.avatar, { backgroundColor: color }]}>
                    <Text style={s.avatarTxt}>{player.username.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.playerInfo}>
                    <View style={s.nameRow}>
                      <Text style={s.playerName} numberOfLines={1}>{player.username}</Text>
                      {isRoomHost && <Text style={s.crownBadge}>👑 Host</Text>}
                      {isMe       && <Text style={s.youBadge}>Eu</Text>}
                    </View>
                    {is4 && (
                      <Text style={s.teamLabel}>
                        {i % 2 === 0 ? '🔵 Equipa A' : '🔴 Equipa B'}
                      </Text>
                    )}
                  </View>
                  <View style={[s.readyDot, { backgroundColor: THEME.green }]} />
                </>
              ) : (
                <>
                  <View style={s.emptyAvatar}>
                    <Text style={s.emptyAvatarTxt}>?</Text>
                  </View>
                  <View style={s.playerInfo}>
                    <Text style={s.waitingTxt}>Aguardando jogador...</Text>
                    {is4 && (
                      <Text style={s.teamLabel}>
                        {i % 2 === 0 ? '🔵 Equipa A' : '🔴 Equipa B'}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>
          )
        })}
      </View>

      {/* ── Rodapé ── */}
      <View style={s.footer}>
        {isHost && isFull && (
          <TouchableOpacity style={[s.startBtn, starting && s.off]} onPress={handleStart} disabled={starting} activeOpacity={0.85}>
            {starting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.startTxt}>▶  Iniciar Jogo</Text>}
          </TouchableOpacity>
        )}

        {isHost && !isFull && (
          <View style={s.waitBox}>
            <ActivityIndicator color={THEME.green} size="small" />
            <Text style={s.waitTxt}>A aguardar {missing} jogador{missing !== 1 ? 'es' : ''}...</Text>
          </View>
        )}

        {!isHost && (
          <View style={s.waitBox}>
            <ActivityIndicator color={THEME.textMute} size="small" />
            <Text style={s.waitTxt}>
              {isFull ? 'À espera que o host inicie...' : 'A aguardar jogadores...'}
            </Text>
          </View>
        )}

        <TouchableOpacity style={s.leaveBtn} onPress={handleLeave} activeOpacity={0.85}>
          <Text style={s.leaveTxt}>🚪  Sair da Sala</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: THEME.bg },

  // Code box
  codeBox:       { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: THEME.border, backgroundColor: THEME.surface },
  codeLabel:     { color: THEME.textMute, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 },
  codeRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  code:          { color: THEME.text, fontSize: 38, fontWeight: '900', letterSpacing: 7 },
  shareBtn:      { backgroundColor: THEME.greenL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: THEME.green },
  shareBtnDone:  { backgroundColor: THEME.green },
  shareBtnTxt:   { color: THEME.green, fontWeight: '700', fontSize: 13 },
  modeLabel:     { color: THEME.textSoft, fontSize: 13, fontWeight: '500' },

  // Progress
  progressRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: THEME.border },
  progressDot:   { width: 12, height: 12, borderRadius: 6 },
  progressFull:  { backgroundColor: THEME.green },
  progressEmpty: { backgroundColor: THEME.border },
  progressTxt:   { color: THEME.textMute, fontSize: 12, fontWeight: '600', marginLeft: 4 },

  // Slots
  slots:         { flex: 1, padding: 16, gap: 10 },
  loadingBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt:    { color: THEME.textMute, fontSize: 14 },

  slot:          { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: THEME.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: THEME.border },
  slotMe:        { borderColor: THEME.green, borderWidth: 2, backgroundColor: THEME.greenL },

  avatar:        { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { color: '#fff', fontWeight: '800', fontSize: 20 },
  playerInfo:    { flex: 1, gap: 3 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  playerName:    { color: THEME.text, fontSize: 16, fontWeight: '700' },
  crownBadge:    { backgroundColor: THEME.goldL, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, fontSize: 11, color: THEME.gold, fontWeight: '700', overflow: 'hidden' },
  youBadge:      { backgroundColor: THEME.greenL, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, fontSize: 11, color: THEME.green, fontWeight: '700', overflow: 'hidden' },
  teamLabel:     { color: THEME.textMute, fontSize: 11, fontWeight: '600' },
  readyDot:      { width: 10, height: 10, borderRadius: 5 },

  emptyAvatar:   { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: THEME.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyAvatarTxt:{ color: THEME.textMute, fontSize: 22 },
  waitingTxt:    { color: THEME.textMute, fontSize: 14, fontStyle: 'italic' },

  // Footer
  footer:        { padding: 16, borderTopWidth: 1, borderTopColor: THEME.border, gap: 10 },
  startBtn:      { backgroundColor: THEME.green, borderRadius: 14, paddingVertical: 17, alignItems: 'center', elevation: 3, shadowColor: THEME.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  off:           { opacity: 0.5, elevation: 0, shadowOpacity: 0 },
  startTxt:      { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  waitBox:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  waitTxt:       { color: THEME.textSoft, fontSize: 14, fontStyle: 'italic' },
  leaveBtn:      { backgroundColor: THEME.surface, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: THEME.red },
  leaveTxt:      { color: THEME.red, fontWeight: '700', fontSize: 14 },
})
