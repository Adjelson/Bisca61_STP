import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Platform, KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import { useAuthStore, setToken } from '../store/authStore'
import { API_URL, AVATAR_COLORS, AVATARS, THEME, APP_AUTHOR, COPYRIGHT, APP_TAGLINE } from '../constants/config'

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>
type Mode = 'login' | 'register'

const ERROR_MAP: Record<string, string> = {
  USERNAME_TAKEN:      'Este nome de utilizador já está em uso.',
  EMAIL_TAKEN:         'Este email já está registado.',
  INVALID_CREDENTIALS: 'Utilizador, email ou password incorretos.',
  NETWORK_ERROR:       'Sem ligação ao servidor. Verifica a rede.',
  TIMEOUT:             'Servidor demorou a responder. Tenta de novo.',
}
function mapError(raw: string): string { return ERROR_MAP[raw] ?? raw }

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../assets/logo.png') as number
const LOGO_SIZE = Platform.OS === 'web' ? 100 : 120

export default function LoginScreen({ navigation }: Props) {
  const [mode,    setMode]    = useState<Mode>('login')
  const [username,setUsername]= useState('')
  const [email,   setEmail]   = useState('')
  const [password,setPassword]= useState('')
  const [confirm, setConfirm] = useState('')
  const [avatar,  setAvatar]  = useState(1)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [showPw,  setShowPw]  = useState(false)
  const [showCf,  setShowCf]  = useState(false)
  const setUser = useAuthStore(s => s.setUser)

  function switchMode(m: Mode) {
    setMode(m); setError(null); setPassword(''); setConfirm(''); setEmail('')
  }

  async function handleSubmit() {
    setError(null)
    const name = username.trim()
    if (name.length < 2)                             { setError('O nome deve ter pelo menos 2 caracteres.'); return }
    if (!/^[a-zA-Z0-9_-]+$/.test(name))             { setError('Apenas letras, números, _ e -.'); return }
    if (password.length < 4)                         { setError('A password deve ter pelo menos 4 caracteres.'); return }
    if (mode === 'register' && password !== confirm) { setError('As passwords não coincidem.'); return }
    if (mode === 'register') {
      if (!email.trim())                                              { setError('O email é obrigatório.'); return }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))         { setError('Formato de email inválido.'); return }
    }

    setLoading(true)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const endpoint = mode === 'register' ? 'register' : 'login'
      const body: Record<string, unknown> = { username: name, password }
      if (mode === 'register') { body.avatar = avatar; if (email.trim()) body.email = email.trim() }

      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json() as { token?: string; userId?: number; username?: string; avatar?: number; error?: string }
      if (!res.ok) { setError(mapError(data.error ?? 'Erro desconhecido')); return }
      await setToken(data.token!)
      setUser(data.userId!, data.username!, data.avatar!)
      navigation.replace('Lobby')
    } catch (err: unknown) {
      clearTimeout(timeout)
      setError(mapError(err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={s.hero}>
            <Image source={LOGO} style={{ width: LOGO_SIZE, height: LOGO_SIZE }} resizeMode="contain" />
            <Text style={s.appName}>Bisca 61</Text>
            <Text style={s.tagline}>{APP_TAGLINE}</Text>
          </View>

          {/* Tabs */}
          <View style={s.tabs}>
            <Tab active={mode === 'login'} icon="log-in-outline" label="Entrar" onPress={() => switchMode('login')} />
            <Tab active={mode === 'register'} icon="person-add-outline" label="Criar Conta" onPress={() => switchMode('register')} />
          </View>

          {/* Form card */}
          <View style={s.card}>
            {error && (
              <View style={s.errBanner}>
                <Ionicons name="alert-circle" size={16} color={THEME.red} />
                <Text style={s.errText}>{error}</Text>
                <TouchableOpacity onPress={() => setError(null)} hitSlop={10}>
                  <Ionicons name="close" size={18} color={THEME.red} />
                </TouchableOpacity>
              </View>
            )}

            {/* Username */}
            <Field label="Nome de utilizador" icon="person-outline">
              <TextInput
                style={s.input}
                value={username}
                onChangeText={t => { setUsername(t); setError(null) }}
                placeholder="Ex: Adjelson"
                placeholderTextColor={THEME.textMute}
                maxLength={24}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </Field>

            {/* Email (apenas no registo) */}
            {mode === 'register' && (
              <Field label="Email" icon="mail-outline">
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(null) }}
                  placeholder="nome@exemplo.com"
                  placeholderTextColor={THEME.textMute}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </Field>
            )}

            {/* Password */}
            <Field label="Password" icon="lock-closed-outline">
              <View style={s.pwRow}>
                <TextInput
                  style={[s.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                  value={password}
                  onChangeText={t => { setPassword(t); setError(null) }}
                  placeholder="Mínimo 4 caracteres"
                  placeholderTextColor={THEME.textMute}
                  secureTextEntry={!showPw}
                  returnKeyType={mode === 'register' ? 'next' : 'done'}
                  onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(v => !v)} hitSlop={10}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.textSoft} />
                </TouchableOpacity>
              </View>
            </Field>

            {/* Confirmar password */}
            {mode === 'register' && (
              <Field label="Confirmar password" icon="shield-checkmark-outline">
                <View style={s.pwRow}>
                  <TextInput
                    style={[s.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                    value={confirm}
                    onChangeText={t => { setConfirm(t); setError(null) }}
                    placeholder="Repete a password"
                    placeholderTextColor={THEME.textMute}
                    secureTextEntry={!showCf}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowCf(v => !v)} hitSlop={10}>
                    <Ionicons name={showCf ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.textSoft} />
                  </TouchableOpacity>
                </View>
              </Field>
            )}

            {/* Avatar */}
            {mode === 'register' && (
              <>
                <View style={s.fieldHeader}>
                  <Ionicons name="color-palette-outline" size={15} color={THEME.textSoft} />
                  <Text style={s.label}>Avatar</Text>
                </View>
                <View style={s.avatarGrid}>
                  {AVATAR_COLORS.map((color, i) => {
                    const n = i + 1; const sel = avatar === n
                    return (
                      <TouchableOpacity key={n} onPress={() => setAvatar(n)} activeOpacity={0.8}>
                        <View style={[s.avatarCircle, { backgroundColor: color }, sel && s.avatarSel]}>
                          <Text style={s.avatarEmoji}>{AVATARS[i]}</Text>
                          {sel && (
                            <View style={s.avatarCheck}>
                              <Ionicons name="checkmark" size={9} color="#fff" />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </>
            )}

            {/* Submit */}
            <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name={mode === 'login' ? 'log-in-outline' : 'person-add-outline'} size={18} color="#fff" />
                    <Text style={s.btnText}>{mode === 'login' ? 'Entrar' : 'Criar Conta'}</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'register' : 'login')} hitSlop={10}>
              <Text style={s.hint}>
                {mode === 'login' ? 'Não tens conta? ' : 'Já tens conta? '}
                <Text style={s.hintLink}>{mode === 'login' ? 'Criar conta' : 'Entrar'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerCopy}>{COPYRIGHT}</Text>
            <Text style={s.footerBy}>Desenvolvido por {APP_AUTHOR}</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Tab({ active, icon, label, onPress }: { active: boolean; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.tab, active && s.tabActive]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={16} color={active ? '#fff' : THEME.textMute} />
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; children: React.ReactNode }) {
  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldHeader}>
        <Ionicons name={icon} size={15} color={THEME.textSoft} />
        <Text style={s.label}>{label}</Text>
      </View>
      {children}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: THEME.bg },
  scroll:    { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 28 },

  hero:      { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  appName:   { fontSize: 30, fontWeight: '900', color: THEME.text, letterSpacing: -0.5, marginTop: 10 },
  tagline:   { fontSize: 13, color: THEME.textMute, marginTop: 3, fontWeight: '500' },

  tabs:          { flexDirection: 'row', backgroundColor: THEME.surface, borderRadius: 14, marginBottom: 16, padding: 4, borderWidth: 1, borderColor: THEME.border },
  tab:           { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive:     { backgroundColor: THEME.green, elevation: 2, shadowColor: THEME.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  tabText:       { color: THEME.textMute, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '800' },

  card:      { backgroundColor: THEME.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: THEME.border },

  errBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 14, gap: 8, borderLeftWidth: 3, borderLeftColor: THEME.red },
  errText:   { color: THEME.red, flex: 1, fontSize: 13, lineHeight: 19 },

  fieldWrap:   { marginTop: 14 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  label:       { color: THEME.textSoft, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  input:       { backgroundColor: THEME.bg, color: THEME.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, borderWidth: 1.5, borderColor: THEME.border },

  pwRow:     { flexDirection: 'row' },
  eyeBtn:    { paddingHorizontal: 14, backgroundColor: THEME.bg, borderWidth: 1.5, borderLeftWidth: 0, borderColor: THEME.border, borderTopRightRadius: 12, borderBottomRightRadius: 12, justifyContent: 'center' },

  avatarGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  avatarCircle:  { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarSel:     { borderWidth: 3, borderColor: THEME.green },
  avatarEmoji:   { fontSize: 22, lineHeight: 28 },
  avatarCheck:   { position: 'absolute', bottom: -2, right: -2, backgroundColor: THEME.green, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },

  btn:       { backgroundColor: THEME.green, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 22, flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 3, shadowColor: THEME.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  btnOff:    { opacity: 0.5, elevation: 0, shadowOpacity: 0 },
  btnText:   { color: '#fff', fontSize: 16, fontWeight: '800' },

  hint:      { color: THEME.textMute, textAlign: 'center', marginTop: 16, fontSize: 13 },
  hintLink:  { color: THEME.green, fontWeight: '700' },

  footer:    { alignItems: 'center', paddingTop: 24, gap: 4 },
  footerCopy:{ color: THEME.textMute, fontSize: 12, fontWeight: '500' },
  footerBy:  { color: THEME.textMute, fontSize: 11 },
})
