import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { AVATAR_COLORS, AVATARS } from '../constants/config'

interface Props {
  avatar: number
  size?: number
  style?: ViewStyle
  /** Draw a coloured ring to highlight the current player */
  ring?: boolean
  ringColor?: string
}

export function PlayerAvatar({ avatar, size = 40, style, ring = false, ringColor }: Props) {
  const idx    = (avatar - 1) % AVATAR_COLORS.length
  const color  = AVATAR_COLORS[idx] ?? '#EF4444'
  const emoji  = AVATARS[idx]      ?? '🦁'
  const font   = Math.round(size * 0.52)

  return (
    <View
      style={[
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          backgroundColor: color,
          alignItems:      'center',
          justifyContent:  'center',
          borderWidth:     ring ? 3 : 0,
          borderColor:     ring ? (ringColor ?? '#059669') : 'transparent',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: font, lineHeight: size * 1.1 }} numberOfLines={1}>
        {emoji}
      </Text>
    </View>
  )
}
