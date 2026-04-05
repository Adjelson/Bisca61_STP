import { z } from 'zod'

export const CreateRoomSchema = z.object({
  playerCount: z.union([z.literal(2), z.literal(4)]),
})

export type CreateRoomInput = z.infer<typeof CreateRoomSchema>

export const JoinRoomSchema = z.object({
  code: z
    .string()
    .length(6, 'Room code must be exactly 6 characters')
    .toUpperCase(),
})

export type JoinRoomInput = z.infer<typeof JoinRoomSchema>

export const RoomCodeSchema = z.string().length(6).toUpperCase()
