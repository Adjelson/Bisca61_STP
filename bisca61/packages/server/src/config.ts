import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  PORT:             z.coerce.number().default(3001),
  DATABASE_URL:     z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV:         z.enum(['development', 'production', 'test']).default('development'),
  // Origens permitidas pelo CORS (separadas por vírgula).
  // Em desenvolvimento o default aceita tudo; em produção define explicitamente.
  ALLOWED_ORIGINS:  z.string().default('*'),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
