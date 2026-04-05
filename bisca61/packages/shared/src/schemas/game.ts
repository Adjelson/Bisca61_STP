import { z } from 'zod'

export const SuitSchema = z.enum(['E', 'C', 'O', 'P'])
export const RankSchema = z.enum(['A', '5', 'K', 'J', 'Q', '6', '7', '4', '3', '2'])

export const CardSchema = z.object({
  s: SuitSchema,
  r: RankSchema,
})

export const PlayCardSchema = z.object({
  code: z.string().length(6),
  card: CardSchema,
})

export type PlayCardInput = z.infer<typeof PlayCardSchema>
