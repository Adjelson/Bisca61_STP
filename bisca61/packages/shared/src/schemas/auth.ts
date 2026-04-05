import { z } from 'zod'

const usernameField = z
  .string()
  .min(2, 'O nome deve ter pelo menos 2 caracteres')
  .max(24, 'O nome deve ter no máximo 24 caracteres')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Apenas letras, números, _ e -')

const passwordField = z
  .string()
  .min(4, 'A password deve ter pelo menos 4 caracteres')
  .max(100, 'Password demasiado longa')

export const RegisterSchema = z.object({
  username: usernameField,
  password: passwordField,
  avatar: z.number().int().min(1).max(8).default(1),
})

export const LoginSchema = z.object({
  username: usernameField,
  password: passwordField,
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput    = z.infer<typeof LoginSchema>

export const SessionSchema = z.object({
  token:    z.string().length(64),
  userId:   z.number().int().positive(),
  username: z.string(),
  avatar:   z.number().int().min(1).max(8),
})

export type SessionOutput = z.infer<typeof SessionSchema>
