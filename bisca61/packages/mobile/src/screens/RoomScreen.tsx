import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { useGameSocket } from '../hooks/useGameSocket'
import { AVATAR_COLORS, THEME } from '../constants/config'

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>

export default function RoomScreen({ route, navigation }: Props) {
  const { code }  = route.params
  const { userId } = useAuthStore()
  const room       = useGameStore(s => s.room)
  const gameState  = useGameStore(s => s.gameState)
  const [starting, setStarting] = useState(false)

  const { startGame } = useGameSocket({
    code,
    onGameEnded: () => {},
    onError: (msg) => Alert.alert('Erro', msg),
  })

  useEffect(() => {
    if (gameState?.phase === 'playing') {
      navigation.replace('Play', { code })
    }
  }, [gameState?.phase])

  async function handleStart() {
    setStarting(true)
    const err = await startGame()
    setStarting(false)
    if (err) Alert.alert('Erro', err)
  }

  const isHost = room?.hostId === userId
  const isFull = room ? room.players.length >= room.playerCount : false
  const missing = (room?.playerCount ?? 2) - (room?.players.length ?? 0)

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* Código da sala */}
      <View style={s.codeBox}>
        <Text style={s.codeLabel}>CÓDIGO DA SALA</Text>
        <Text style={s.code}>{code}</Text>
        <Text style={s.modeLabel}>
          {room?.playerCount === 4 ? '4 jogadores — duplas' : '2 jogadores — individual'}
        </Text>
      </View>

      {/* Slots de jogadores */}
      <View style={s.slots}>
        {!room && <ActivityIndicator color={THEME.green} size="large" />}
        {room && Array.from({ length: room.playerCount }, (_, i) => {
          const player = room.players.find(p => p.slot === i)
          const color  = player
            ? AVATAR_COLORS[(player.avatar - 1) % AVATAR_COLORS.length] ?? THEME.textMute
            : undefined
          const isMe   = player?.userId === userId

          return (
            <View key={i} style={[s.slot, isMe && s.slotMe]}>
              {player ? (
                <>
                  <View style={[s.avatar, { backgroundColor: color }]}>
                    <Text style={s.avatarText}>
                      {player.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.playerInfo}>
                    <Text style={s.playerName} numberOfLines={1}>
                      {player.username}
                      {player.userId === room.hostId ? '  👑' : ''}
                    </Text>
                    {isMe && <Text style={s.youBadge}>Você</Text>}
                  </View>
                  <View style={s.readyDot} />
                </>
              ) : (
                <>
                  <View style={s.emptyAvatar}><Text style={s.emptyText}>?</Text></View>
                  <Text style={s.waiting}>Aguardando jogador...</Text>
                </>
              )}
            </View>
          )
        })}
      </View>

      {/* Rodapé */}
      <View style={s.footer}>
        {isHost && isFull && (
          <TouchableOpacity
            style={[s.startBtn, starting && s.off]}
            onPress={handleStart}
            disabled={starting}
          >
            {starting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.startText}>▶  Iniciar Jogo</Text>
            }
          </TouchableOpacity>
        )}

        {isHost && !isFull && (
          <View style={s.waitBox}>
            <ActivityIndicator color={THEME.green} size="small" />
            <Text style={s.waitText}>
              A aguardar {missing} jogador{missing !== 1 ? 'es' : ''}...
            </Text>
          </View>
        )}

        {!isHost && (
          <View style={s.waitBox}>
            <ActivityIndicator color={THEME.textMute} size="small" />
            <Text style={s.waitText}>
              {isFull ? 'À espera que o host inicie o jogo...' : 'A aguardar jogadores...'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: THEME.bg },

  codeBox:     { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: THEME.border },
  codeLabel:   { color: THEME.textMute, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
  code:        { color: THEME.text, fontSize: 42, fontWeight: '900', letterSpacing: 8, marginVertical: 6 },
  modeLabel:   { color: THEME.textSoft, fontSize: 13 },

  slots:       { flex: 1, padding: 20, gap: 10 },
  slot:        { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: THEME.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: THEME.border },
  slotMe:      { borderColor: THEME.green, borderWidth: 2, backgroundColor: THEME.greenL },

  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontWeight: '800', fontSize: 20 },
  playerInfo:  { flex: 1, gap: 2 },
  playerName:  { color: THEME.text, fontSize: 16, fontWeight: '700' },
  youBadge:    { color: THEME.green, fontSize: 11, fontWeight: '700' },
  readyDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.green },

  emptyAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: THEME.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText:   { color: THEME.textMute, fontSize: 22 },
  waiting:     { color: THEME.textMute, fontSize: 14, fontStyle: 'italic' },

  footer:      { padding: 20, borderTopWidth: 1, borderTopColor: THEME.border },
  startBtn:    { backgroundColor: THEME.green, borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  off:         { opacity: 0.5 },
  startText:   { color: '#fff', fontSize: 17, fontWeight: '800' },
  waitBox:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitText:    { color: THEME.textSoft, fontSize: 14, fontStyle: 'italic' },
})
