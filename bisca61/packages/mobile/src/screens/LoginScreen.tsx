import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore, setToken } from '../store/authStore'
import { API_URL, AVATAR_COLORS, THEME } from '../constants/config'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>
type Mode = 'login' | 'register'

// Mapeamento de erros do servidor para português
const ERROR_MAP: Record<string, string> = {
  USERNAME_TAKEN:      'Este nome de utilizador já está em uso.',
  INVALID_CREDENTIALS: 'Nome ou password incorretos.',
  NETWORK_ERROR:       'Não foi possível ligar ao servidor.',
  TIMEOUT:             'O servidor demorou demasiado a responder.',
}

function mapError(raw: string): string {
  return ERROR_MAP[raw] ?? raw
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.png') as number

export default function LoginScreen({ navigation }: Props) {
  const [mode, setMode]         = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [avatar, setAvatar]     = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const setUser = useAuthStore(s => s.setUser)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit() {
    setError(null)

    const name = username.trim()
    if (name.length < 2)              { setError('O nome deve ter pelo menos 2 caracteres.'); return }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) { setError('Apenas letras, números, _ e -.'); return }
    if (password.length < 4)          { setError('A password deve ter pelo menos 4 caracteres.'); return }
    if (mode === 'register' && password !== confirm) { setError('As passwords não coincidem.'); return }

    setLoading(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const endpoint = mode === 'register' ? 'register' : 'login'
      const body: Record<string, unknown> = { username: name, password }
      if (mode === 'register') body.avatar = avatar

      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json() as { token?: string; userId?: number; username?: string; avatar?: number; error?: string }
      if (!res.ok) {
        setError(mapError(data.error ?? 'Erro desconhecido'))
        return
      }

      await setToken(data.token!)
      setUser(data.userId!, data.username!, data.avatar!)
      navigation.replace('Lobby')
    } catch (err: unknown) {
      clearTimeout(timeout)
      const isAbort = err instanceof Error && err.name === 'AbortError'
      setError(mapError(isAbort ? 'TIMEOUT' : 'NETWORK_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoWrap}>
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
        </View>

        <Text style={s.subtitle}>Nova Manilha · Multijogador</Text>

        {/* Toggle login / registo */}
        <View style={s.toggle}>
          <TouchableOpacity
            style={[s.tab, mode === 'login' && s.tabActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, mode === 'register' && s.tabActive]}
            onPress={() => switchMode('register')}
          >
            <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Criar Conta</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {/* Banner de erro */}
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorIcon}>⚠</Text>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>Nome de utilizador</Text>
          <TextInput
            style={[s.input, !!error && s.inputErr]}
            value={username}
            onChangeText={t => { setUsername(t); setError(null) }}
            placeholder="Ex: Adjelson"
            placeholderTextColor={THEME.textMute}
            maxLength={24}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={[s.input, !!error && s.inputErr]}
            value={password}
            onChangeText={t => { setPassword(t); setError(null) }}
            placeholder="Mínimo 4 caracteres"
            placeholderTextColor={THEME.textMute}
            secureTextEntry
            returnKeyType={mode === 'register' ? 'next' : 'done'}
            onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
          />

          {mode === 'register' && (
            <>
              <Text style={s.label}>Confirmar password</Text>
              <TextInput
                style={[s.input, !!error && s.inputErr]}
                value={confirm}
                onChangeText={t => { setConfirm(t); setError(null) }}
                placeholder="Repete a password"
                placeholderTextColor={THEME.textMute}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <Text style={s.label}>Avatar</Text>
              <View style={s.avatarRow}>
                {AVATAR_COLORS.map((color, i) => {
                  const n = i + 1
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.avatarCircle, { backgroundColor: color }, avatar === n && s.avatarSel]}
                      onPress={() => setAvatar(n)}
                    >
                      <Text style={s.avatarText}>{n}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[s.btn, loading && s.btnOff]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{mode === 'login' ? 'Entrar' : 'Criar Conta'}</Text>
            }
          </TouchableOpacity>

          {mode === 'login' ? (
            <TouchableOpacity onPress={() => switchMode('register')}>
              <Text style={s.hint}>Não tens conta? <Text style={s.hintLink}>Criar conta</Text></Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => switchMode('login')}>
              <Text style={s.hint}>Já tens conta? <Text style={s.hintLink}>Entrar</Text></Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const LOGO_SIZE = Platform.OS === 'web' ? 120 : 140

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: THEME.bg },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoWrap:     { alignItems: 'center', marginBottom: 8 },
  logo:         { width: LOGO_SIZE, height: LOGO_SIZE },
  subtitle:     { fontSize: 13, color: THEME.textMute, textAlign: 'center', marginBottom: 28, fontWeight: '500' },

  toggle:       { flexDirection: 'row', backgroundColor: THEME.surface, borderRadius: 12, marginBottom: 16, padding: 4, borderWidth: 1, borderColor: THEME.border },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive:    { backgroundColor: THEME.green },
  tabText:      { color: THEME.textMute, fontWeight: '600', fontSize: 14 },
  tabTextActive:{ color: '#fff' },

  card:         { backgroundColor: THEME.surface, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: THEME.border },

  errorBanner:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12, marginBottom: 16, gap: 8, borderLeftWidth: 3, borderLeftColor: THEME.red },
  errorIcon:    { color: THEME.red, fontSize: 15 },
  errorText:    { color: THEME.red, flex: 1, fontSize: 13, lineHeight: 20 },

  label:        { color: THEME.textSoft, fontSize: 12, marginBottom: 6, marginTop: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  input:        { backgroundColor: THEME.bg, color: THEME.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1.5, borderColor: THEME.border },
  inputErr:     { borderColor: THEME.red },

  avatarRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarSel:    { borderWidth: 3, borderColor: THEME.green },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 15 },

  btn:          { backgroundColor: THEME.green, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnOff:       { opacity: 0.6 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },

  hint:         { color: THEME.textMute, textAlign: 'center', marginTop: 16, fontSize: 13 },
  hintLink:     { color: THEME.green, fontWeight: '700' },
})
