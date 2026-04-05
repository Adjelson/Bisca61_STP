import { View, Text, StyleSheet } from 'react-native'
import { THEME } from '../constants/config'

interface Props {
  points:      [number, number]
  tricks:      [number, number]
  myTeam:      0 | 1
  ondaNumber:  number
}

const WIN = 61

export function ScoreBar({ points, tricks, myTeam, ondaNumber }: Props) {
  const opp    = myTeam === 0 ? 1 : 0
  const myPts  = points[myTeam]
  const oppPts = points[opp]
  const myPct  = Math.min(myPts / WIN, 1)
  const oppPct = Math.min(oppPts / WIN, 1)
  const myWin  = myPts >= WIN
  const oppWin = oppPts >= WIN

  return (
    <View style={s.container}>
      <View style={s.row}>
        {/* Adversário */}
        <View style={s.side}>
          <Text style={[s.pts, oppWin && s.winPts]}>{oppPts}</Text>
          <Text style={s.label}>Adv · {tricks[opp]}o</Text>
        </View>

        {/* Centro */}
        <View style={s.center}>
          <Text style={s.onda}>Onda {ondaNumber}</Text>
          <Text style={s.target}>meta: {WIN} pts</Text>
        </View>

        {/* Nós */}
        <View style={[s.side, s.right]}>
          <Text style={[s.pts, s.mine, myWin && s.winPts]}>{myPts}</Text>
          <Text style={s.label}>Nós · {tricks[myTeam]}o</Text>
        </View>
      </View>

      {/* Barra de progresso dupla */}
      <View style={s.barTrack}>
        <View style={[s.barFill, s.barOpp,   { flex: oppPct }]} />
        <View style={[s.barEmpty,             { flex: Math.max(0, 2 - myPct - oppPct) }]} />
        <View style={[s.barFill, s.barMine,  { flex: myPct  }]} />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { backgroundColor: THEME.bg, borderBottomWidth: 1, borderBottomColor: THEME.border },
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  side:      { flex: 1, alignItems: 'flex-start' },
  right:     { alignItems: 'flex-end' },
  center:    { alignItems: 'center' },
  pts:       { fontSize: 24, fontWeight: '800', color: THEME.textSoft },
  mine:      { color: THEME.green },
  winPts:    { color: THEME.gold },
  label:     { fontSize: 10, color: THEME.textMute },
  onda:      { fontSize: 12, color: THEME.text, fontWeight: '700' },
  target:    { fontSize: 10, color: THEME.textMute },
  barTrack:  { flexDirection: 'row', height: 3 },
  barFill:   { height: 3 },
  barOpp:    { backgroundColor: THEME.red },
  barMine:   { backgroundColor: THEME.green },
  barEmpty:  { backgroundColor: THEME.border },
})
