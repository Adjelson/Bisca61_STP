import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { disconnectSocket } from '../socket/socketClient'

const TOKEN_KEY = 'bisca61_token'

// expo-secure-store não suporta web — usa localStorage como fallback
// expo-secure-store não suporta web — usa globalThis.localStorage como fallback
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ls = (globalThis as any).localStorage as { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } | undefined

export const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return ls?.getItem(TOKEN_KEY) ?? null
  return SecureStore.getItemAsync(TOKEN_KEY)
}
export const setToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') { ls?.setItem(TOKEN_KEY, token); return }
  return SecureStore.setItemAsync(TOKEN_KEY, token)
}
const deleteToken = async (): Promise<void> => {
  if (Platform.OS === 'web') { ls?.removeItem(TOKEN_KEY); return }
  return SecureStore.deleteItemAsync(TOKEN_KEY)
}

export interface AuthState {
  userId: number | null
  username: string | null
  avatar: number
  isLoggedIn: boolean
  setUser: (userId: number, username: string, avatar: number) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  username: null,
  avatar: 1,
  isLoggedIn: false,

  setUser: (userId, username, avatar) =>
    set({ userId, username, avatar, isLoggedIn: true }),

  logout: async () => {
    disconnectSocket()
    await deleteToken()
    set({ userId: null, username: null, avatar: 1, isLoggedIn: false })
  },
}))
