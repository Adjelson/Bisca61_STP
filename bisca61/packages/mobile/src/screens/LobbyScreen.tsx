import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { PlayerAvatar } from '../components/PlayerAvatar'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore, getToken } from '../store/authStore'
import { API_URL, THEME, COPYRIGHT } from '../constants/config'
import { mapError } from '../utils/errors'
import { startAmbient, stopAmbient, setAmbientMuted } from '../utils/ambientSound'
import type { RoomInfo } from '../types'

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>
type ServerStatus = 'online' | 'offline' | 'checking'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.png') as number

export default function LobbyScreen({ navigation }: Props) {
  const { username, avatar, logout } = useAuthStore()
  const [rooms,  setRooms]   = useState<RoomInfo[]>([])
  const [code,   setCode]    = useState('')
  const [loading,setLoading] = useState(false)
  const [refresh,setRefresh] = useState(false)
  const [status, setStatus]  = useState<ServerStatus>('checking')
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [ambientMuted, setAmbientMutedState] = useState(false)

  // Ambient sound lifecycle
  useEffect(() => {
    startAmbient()
    return () => { stopAmbient() }
  }, [])

  function toggleAmbient() {
    const next = !ambientMuted
    setAmbientMutedState(next)
    setAmbientMuted(next)
  }

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
    setLoading(true); setCreateErr(null)
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
      setCreateErr(err instanceof Error ? mapError(err.message) : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function joinByCode() {
    const c = code.trim().toUpperCase()
    if (c.length !== 6) { Alert.alert('Código inválido', 'O código deve ter 6 caracteres.'); return }
    navigation.navigate('Room', { code: c })
  }

  async function handleLogout() {
    Alert.alert('Sair', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await logout(); navigation.replace('Login') } },
    ])
  }

  const offline = status === 'offline'

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.brand}>
          <Image source={LOGO} style={s.brandLogo} resizeMode="contain" />
          <View>
            <Text style={s.brandName}>BISCA61STP</Text>
            <View style={s.statusRow}>
              <Ionicons
                name={status === 'online' ? 'wifi' : status === 'offline' ? 'cloud-offline-outline' : 'ellipse-outline'}
                size={10}
                color={status === 'online' ? THEME.green : status === 'offline' ? THEME.red : THEME.gold}
              />
              <Text style={s.statusTxt}>
                {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'A verificar...'}
              </Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={toggleAmbient}>
            <Ionicons
              name={ambientMuted ? 'volume-mute' : 'volume-medium'}
              size={20}
              color={ambientMuted ? THEME.textMute : THEME.textSoft}
            />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Rules')}>
            <Ionicons name="book-outline" size={20} color={THEME.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
            <PlayerAvatar avatar={avatar ?? 1} size={38} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Banners ── */}
      {offline && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color="#92400E" />
          <Text style={s.offlineTxt}> Sem ligação ao servidor — a tentar reconectar...</Text>
        </View>
      )}
      {createErr && (
        <View style={s.errBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={THEME.red} />
          <Text style={s.errTxt}>{createErr}</Text>
          <TouchableOpacity onPress={() => setCreateErr(null)} hitSlop={10}>
            <Ionicons name="close" size={18} color={THEME.red} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={rooms}
        keyExtractor={r => r.code}
        refreshControl={
          <RefreshControl
            refreshing={refresh}
            onRefresh={async () => { setRefresh(true); await fetchRooms(); setRefresh(false) }}
            tintColor={THEME.green}
            colors={[THEME.green]}
          />
        }
        ListHeaderComponent={
          <>
            {/* ── Criar Sala ── */}
            <View style={s.section}>
              <SectionHeader icon="game-controller-outline" title="Nova Partida" />
              <View style={s.createRow}>
                <CreateBtn
                  label="2 Jogadores" icon="person-outline"
                  sub="Individual"
                  color={THEME.green}
                  disabled={loading || offline}
                  onPress={() => createRoom(2)}
                  loading={loading}
                />
                <CreateBtn
                  label="4 Jogadores" icon="people-outline"
                  sub="Em Duplas"
                  color={THEME.blue}
                  disabled={loading || offline}
                  onPress={() => createRoom(4)}
                />
              </View>
            </View>

            {/* ── Entrar com Código ── */}
            <View style={s.section}>
              <SectionHeader icon="key-outline" title="Entrar com Código" />
              <View style={s.codeRow}>
                <TextInput
                  style={s.codeInput}
                  value={code}
                  onChangeText={t => setCode(t.toUpperCase())}
                  placeholder="ABCD12"
                  placeholderTextColor={THEME.textMute}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={joinByCode}
                />
                <TouchableOpacity
                  style={[s.joinBtn, offline && s.btnOff]}
                  onPress={joinByCode}
                  disabled={offline}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Salas Abertas ── */}
            <View style={[s.section, { paddingBottom: 0 }]}>
              <View style={s.roomsHeader}>
                <SectionHeader icon="albums-outline" title="Salas Abertas" />
                <TouchableOpacity style={s.refreshBtn} onPress={fetchRooms} hitSlop={10}>
                  <Ionicons name="refresh-outline" size={14} color={THEME.green} />
                  <Text style={s.refreshTxt}>Atualizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => <RoomCard room={item} onPress={() => navigation.navigate('Room', { code: item.code })} />}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Ionicons name="albums-outline" size={44} color={THEME.border} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTxt}>
              {status === 'checking' ? 'A carregar salas...' : 'Nenhuma sala aberta.'}
            </Text>
            {status !== 'checking' && (
              <Text style={s.emptyHint}>Cria uma nova partida acima!</Text>
            )}
          </View>
        }
        contentContainerStyle={s.list}
        ListFooterComponent={
          <View style={s.footer}>
            <Text style={s.footerCopy}>{COPYRIGHT}</Text>
            <Text style={s.footerUser}>Sessão: {username ?? '?'}</Text>
          </View>
        }
      />

    </SafeAreaView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string }) {
  return (
    <View style={sh.row}>
      <Ionicons name={icon} size={14} color={THEME.textMute} />
      <Text style={sh.title}>{title}</Text>
    </View>
  )
}

function CreateBtn({ label, icon, sub, color, disabled, onPress, loading }: {
  label: string; icon: React.ComponentProps<typeof Ionicons>['name']; sub: string; color: string
  disabled: boolean; onPress: () => void; loading?: boolean
}) {
  return (
    <TouchableOpacity
      style={[cb.btn, { backgroundColor: color }, disabled && cb.off]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <>
            <Ionicons name={icon} size={24} color="#fff" />
            <Text style={cb.label}>{label}</Text>
            <Text style={cb.sub}>{sub}</Text>
          </>
      }
    </TouchableOpacity>
  )
}

function RoomCard({ room, onPress }: { room: RoomInfo; onPress: () => void }) {
  const taken = room.players.length
  const total = room.playerCount
  const free  = total - taken
  const pct   = taken / total

  return (
    <TouchableOpacity style={rc.card} onPress={onPress} activeOpacity={0.82}>
      <View style={rc.left}>
        <View style={rc.codeRow}>
          <Text style={rc.code}>{room.code}</Text>
          <View style={rc.modeBadge}>
            <Ionicons name={total === 4 ? 'people-outline' : 'person-outline'} size={11} color={THEME.green} />
            <Text style={rc.modeTxt}>{total === 4 ? ' Duplas' : ' Individual'}</Text>
          </View>
        </View>
        {/* Player slots mini indicator */}
        <View style={rc.slots}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={[rc.slot, i < taken ? rc.slotFull : rc.slotEmpty]} />
          ))}
          <Text style={rc.slotTxt}>{free} livre{free !== 1 ? 's' : ''}</Text>
        </View>
        {/* Progress bar */}
        <View style={rc.bar}>
          <View style={[rc.barFill, { flex: pct }]} />
          <View style={[rc.barEmpty, { flex: 1 - pct }]} />
        </View>
      </View>
      <View style={rc.right}>
        <Text style={rc.joinTxt}>Entrar</Text>
        <Ionicons name="chevron-forward" size={18} color={THEME.green} />
      </View>
    </TouchableOpacity>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: THEME.bg },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.border, backgroundColor: THEME.bg },
  brand:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo:    { width: 36, height: 36 },
  brandName:    { color: THEME.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  statusTxt:    { color: THEME.textMute, fontSize: 11 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: THEME.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },

  offlineBanner:{ backgroundColor: '#FEF3C7', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  offlineTxt:   { color: '#92400E', fontSize: 13, fontWeight: '600' },
  errBanner:    { backgroundColor: '#FEF2F2', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 3, borderLeftColor: THEME.red },
  errTxt:       { color: THEME.red, flex: 1, fontSize: 13, marginLeft: 8 },

  list:         { paddingBottom: 16 },

  section:      { padding: 16, borderBottomWidth: 1, borderBottomColor: THEME.border },
  roomsHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  refreshBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshTxt:   { color: THEME.green, fontSize: 13, fontWeight: '700' },

  createRow:    { flexDirection: 'row', gap: 12, marginTop: 10 },

  codeRow:      { flexDirection: 'row', gap: 10, marginTop: 10 },
  codeInput:    { flex: 1, backgroundColor: THEME.surface, color: THEME.text, borderRadius: 12, paddingHorizontal: 16, fontSize: 20, fontWeight: '800', letterSpacing: 4, borderWidth: 1.5, borderColor: THEME.border, paddingVertical: 13 },
  joinBtn:      { backgroundColor: THEME.green, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13, justifyContent: 'center', elevation: 2, shadowColor: THEME.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  joinBtnTxt:   { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnOff:       { opacity: 0.4 },

  emptyBox:     { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyTxt:     { color: THEME.textSoft, fontSize: 15, fontWeight: '600' },
  emptyHint:    { color: THEME.textMute, fontSize: 13, marginTop: 6 },

  footer:       { alignItems: 'center', paddingVertical: 24, gap: 3 },
  footerCopy:   { color: THEME.textMute, fontSize: 11 },
  footerUser:   { color: THEME.textMute, fontSize: 11 },
})

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  title: { color: THEME.textSoft, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
})

const cb = StyleSheet.create({
  btn:   { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 4, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  off:   { opacity: 0.4, elevation: 0, shadowOpacity: 0 },
  label: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sub:   { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
})

const rc = StyleSheet.create({
  card:     { marginHorizontal: 16, marginTop: 10, backgroundColor: THEME.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  left:     { flex: 1, gap: 6 },
  codeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  code:     { color: THEME.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  modeBadge:{ backgroundColor: THEME.greenL, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignItems: 'center' },
  modeTxt:  { color: THEME.green, fontSize: 11, fontWeight: '700' },
  slots:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slot:     { width: 10, height: 10, borderRadius: 5 },
  slotFull: { backgroundColor: THEME.green },
  slotEmpty:{ backgroundColor: THEME.border },
  slotTxt:  { color: THEME.textMute, fontSize: 11, marginLeft: 4 },
  bar:      { flexDirection: 'row', height: 3, borderRadius: 2, overflow: 'hidden' },
  barFill:  { backgroundColor: THEME.green },
  barEmpty: { backgroundColor: THEME.border },
  right:    { alignItems: 'center', paddingLeft: 12 },
  joinTxt:  { color: THEME.green, fontWeight: '800', fontSize: 13 },
})
