import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore, getToken } from '../store/authStore'
import { API_URL, AVATAR_COLORS, THEME } from '../constants/config'
import { mapError } from '../utils/errors'
import type { RoomInfo } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>
type ServerStatus = 'online' | 'offline' | 'checking'

export default function LobbyScreen({ navigation }: Props) {
  const { username, avatar, logout } = useAuthStore()
  const [rooms, setRooms]           = useState<RoomInfo[]>([])
  const [code, setCode]             = useState('')
  const [loading, setLoading]       = useState(false)
  const [refreshing, setRefresh]    = useState(false)
  const [serverStatus, setStatus]   = useState<ServerStatus>('checking')
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/rooms`)
      if (!res.ok) throw new Error('server_error')
      const data = await res.json()
      setRooms(data.rooms ?? [])
      setStatus('online')
    } catch {
      setStatus('offline')
    }
  }, [])

  useEffect(() => {
    fetchRooms()
    const t = setInterval(fetchRooms, 4000)
    return () => clearInterval(t)
  }, [fetchRooms])

  async function createRoom(playerCount: 2 | 4) {
    setLoading(true)
    setCreateError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-token': token ?? '' },
        body: JSON.stringify({ playerCount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar sala')
      navigation.navigate('Room', { code: data.room.code })
    } catch (err: unknown) {
      const msg = err instanceof Error ? mapError(err.message) : 'Erro desconhecido'
      setCreateError(msg)
    } finally {
      setLoading(false)
    }
  }

  function joinByCode() {
    const c = code.trim().toUpperCase()
    if (c.length !== 6) {
      Alert.alert('Código inválido', 'O código deve ter 6 caracteres.')
      return
    }
    navigation.navigate('Room', { code: c })
  }

  async function handleLogout() {
    await logout()
    navigation.replace('Login')
  }

  const color = AVATAR_COLORS[(avatar - 1) % AVATAR_COLORS.length] ?? '#e74c3c'

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.user}>
          <View style={[s.avatar, { backgroundColor: color }]}>
            <Text style={s.avatarText}>{avatar}</Text>
          </View>
          <View>
            <Text style={s.username}>{username ?? '?'}</Text>
            <View style={s.statusRow}>
              <View style={[s.dot, serverStatus === 'online' ? s.dotOnline : serverStatus === 'offline' ? s.dotOffline : s.dotChecking]} />
              <Text style={s.statusText}>
                {serverStatus === 'online' ? 'Servidor online' : serverStatus === 'offline' ? 'Servidor offline' : 'A verificar...'}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Rules')} style={s.rulesBtn}>
            <Text style={s.rulesBtnText}>? Regras</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Text style={s.logout}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline banner */}
      {serverStatus === 'offline' && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>⚠ Sem ligação ao servidor — a tentar reconectar...</Text>
        </View>
      )}

      {/* Create error */}
      {createError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>⚠ {createError}</Text>
          <TouchableOpacity onPress={() => setCreateError(null)}><Text style={s.errorClose}>✕</Text></TouchableOpacity>
        </View>
      )}

      {/* Criar Sala */}
      <View style={s.section}>
        <Text style={s.sTitle}>Criar Sala</Text>
        <View style={s.row}>
          <TouchableOpacity
            style={[s.btn, (loading || serverStatus === 'offline') && s.btnOff]}
            onPress={() => createRoom(2)}
            disabled={loading || serverStatus === 'offline'}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>2 Jogadores</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btn4, (loading || serverStatus === 'offline') && s.btnOff]}
            onPress={() => createRoom(4)}
            disabled={loading || serverStatus === 'offline'}
          >
            <Text style={s.btnText}>4 Jogadores</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Entrar com Código */}
      <View style={s.section}>
        <Text style={s.sTitle}>Entrar com Código</Text>
        <View style={s.row}>
          <TextInput
            style={s.codeInput}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="ABCD12"
            placeholderTextColor="#555"
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[s.joinBtn, serverStatus === 'offline' && s.btnOff]}
            onPress={joinByCode}
            disabled={serverStatus === 'offline'}
          >
            <Text style={s.btnText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Salas Abertas */}
      <View style={s.section}>
        <Text style={s.sTitle}>Salas Abertas</Text>
        <FlatList
          data={rooms}
          keyExtractor={r => r.code}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefresh(true); await fetchRooms(); setRefresh(false) }}
              tintColor="#f0c040"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.roomCard} onPress={() => navigation.navigate('Room', { code: item.code })}>
              <View>
                <Text style={s.roomCode}>{item.code}</Text>
                <Text style={s.roomInfo}>{item.players.length}/{item.playerCount} jogadores</Text>
              </View>
              <Text style={s.roomJoin}>Entrar →</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>
              {serverStatus === 'checking' ? 'A carregar...' : 'Nenhuma sala aberta.'}
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: THEME.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.border, backgroundColor: THEME.bg },
  user:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700' },
  username:     { color: THEME.text, fontSize: 15, fontWeight: '700' },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot:          { width: 7, height: 7, borderRadius: 4 },
  dotOnline:    { backgroundColor: THEME.green },
  dotOffline:   { backgroundColor: THEME.red },
  dotChecking:  { backgroundColor: THEME.gold },
  statusText:   { color: THEME.textMute, fontSize: 11 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulesBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surface },
  rulesBtnText: { color: THEME.textSoft, fontWeight: '700', fontSize: 13 },
  logoutBtn:    { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  logout:       { color: THEME.red, fontWeight: '700', fontSize: 13 },
  offlineBanner:{ backgroundColor: '#FEF3C7', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  offlineText:  { color: '#92400E', fontSize: 13, fontWeight: '500' },
  errorBanner:  { backgroundColor: '#FEF2F2', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 3, borderLeftColor: THEME.red },
  errorText:    { color: THEME.red, flex: 1, fontSize: 13 },
  errorClose:   { color: THEME.textMute, fontSize: 16, paddingLeft: 8 },
  section:      { padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.border },
  sTitle:       { color: THEME.textMute, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  row:          { flexDirection: 'row', gap: 12 },
  btn:          { flex: 1, backgroundColor: THEME.green, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btn4:         { backgroundColor: '#3B82F6' },
  btnOff:       { opacity: 0.4 },
  btnText:      { color: '#fff', fontWeight: '700' },
  codeInput:    { flex: 1, backgroundColor: THEME.surface, color: THEME.text, borderRadius: 10, paddingHorizontal: 16, fontSize: 18, fontWeight: '700', letterSpacing: 3, borderWidth: 1, borderColor: THEME.border },
  joinBtn:      { backgroundColor: THEME.green, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 13, justifyContent: 'center' },
  roomCard:     { backgroundColor: THEME.surface, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  roomCode:     { color: THEME.text, fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  roomInfo:     { color: THEME.textMute, fontSize: 12, marginTop: 2 },
  roomJoin:     { color: THEME.green, fontWeight: '700' },
  empty:        { color: THEME.textMute, textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
})
