import { ScrollView, View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { THEME, SUIT_SYMBOLS } from '../constants/config'

const SUITS = [
  { key: 'E', name: 'Espadas', color: THEME.text },
  { key: 'P', name: 'Paus',    color: THEME.text },
  { key: 'C', name: 'Copas',   color: THEME.red  },
  { key: 'O', name: 'Ouros',   color: THEME.red  },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Rule({ text }: { text: string }) {
  return (
    <View style={s.ruleRow}>
      <Text style={s.ruleDot}>•</Text>
      <Text style={s.ruleText}>{text}</Text>
    </View>
  )
}

function Tag({ label, note }: { label: string; note: string }) {
  return (
    <View style={s.tagRow}>
      <View style={s.tag}><Text style={s.tagText}>{label}</Text></View>
      <Text style={s.tagNote}>{note}</Text>
    </View>
  )
}

export default function RulesScreen() {
  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Resumo */}
        <Section title="O Jogo">
          <Rule text="Bisca 61 é um jogo de cartas para 2 ou 4 jogadores (em duplas)." />
          <Rule text="O objetivo é acumular 61 ou mais pontos antes do adversário." />
          <Rule text="As cartas são do baralho português de 40 cartas (4 naipes × 10 valores)." />
        </Section>

        {/* Naipes */}
        <Section title="Naipes">
          <View style={s.suitGrid}>
            {SUITS.map(suit => (
              <View key={suit.key} style={s.suitCard}>
                <Text style={[s.suitSymbol, { color: suit.color }]}>
                  {SUIT_SYMBOLS[suit.key]}
                </Text>
                <Text style={s.suitName}>{suit.name}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* Força das Cartas */}
        <Section title="Força das Cartas (do mais forte ao mais fraco)">
          <View style={s.strengthBox}>
            <Text style={s.strengthLabel}>Naipes Pretos (♠ ♣)</Text>
            <Text style={s.strengthSeq}>A · 5 · K · J · Q · 7 · 6 · 4 · 3 · 2</Text>
          </View>
          <View style={[s.strengthBox, s.strengthBoxRed]}>
            <Text style={[s.strengthLabel, { color: THEME.red }]}>Naipes Vermelhos (♥ ♦)</Text>
            <Text style={[s.strengthSeq, { color: THEME.red }]}>A · 5 · K · J · Q · 2 · 3 · 4 · 6 · 7</Text>
          </View>
          <Text style={s.note}>Nota: o 5 é a Nova Manilha — a segunda carta mais forte.</Text>
        </Section>

        {/* Pontuação */}
        <Section title="Pontuação das Cartas">
          <Tag label="Às (A)"  note="11 pontos" />
          <Tag label="5"       note="10 pontos (Nova Manilha)" />
          <Tag label="Rei (K)" note="4 pontos" />
          <Tag label="Valete (J)" note="3 pontos" />
          <Tag label="Dama (Q)" note="2 pontos" />
          <Tag label="7 · 6 · 4 · 3 · 2" note="0 pontos" />
          <Text style={s.note}>Total do baralho: 120 pontos. Quem chegar a 61 ganha a mão.</Text>
        </Section>

        {/* Como jogar */}
        <Section title="Como Jogar">
          <Rule text="Cada jogador começa com 5 cartas na mão." />
          <Rule text="O primeiro jogador joga uma carta — define o naipe da onda." />
          <Rule text="Os outros jogadores respondem com qualquer carta (não há obrigação de seguir o naipe)." />
          <Rule text="Ganha a onda quem jogar a carta mais forte do naipe de trunfo, ou a mais forte do naipe liderado se não houve trunfo." />
          <Rule text="Quem ganhar a onda lidera a próxima." />
          <Rule text="Após cada onda, cada jogador compra uma carta do monte." />
        </Section>

        {/* Trunfo e Ondas */}
        <Section title="Trunfo e Ondas">
          <Rule text="O trunfo é revelado no início do jogo — a carta virada no fundo do monte." />
          <Rule text="O naipe do trunfo muda a cada onda, seguindo a rotação: Espadas → Copas → Ouros → Paus → Espadas..." />
          <Rule text="Trunfo bate sempre qualquer carta de outro naipe." />
          <Rule text="A carta de trunfo visível fica disponível para quem tiver o 7 do mesmo naipe (ver abaixo)." />
        </Section>

        {/* Trocar o 7 */}
        <Section title="Trocar o 7 de Trunfo ⇄">
          <Rule text="Quando é a tua vez de jogar, se tiveres o 7 do naipe de trunfo atual na mão, podes trocar essa carta pela carta de trunfo visível no monte." />
          <Rule text="A troca é opcional. Aparece um botão '⇄ Trocar 7 de Trunfo' quando a troca está disponível." />
          <Rule text="Só podes trocar antes de jogar a tua carta nessa onda." />
          <Rule text="Não é possível trocar se a carta de trunfo já tiver sido retirada do monte." />
        </Section>

        {/* Fim de jogo */}
        <Section title="Fim da Mão e Vitória">
          <Rule text="A mão termina quando todas as cartas foram jogadas." />
          <Rule text="A equipa/jogador com 61 ou mais pontos ganha." />
          <Rule text="Se ambos ficarem com 60 pontos, é empate." />
          <Rule text="Em 4 jogadores, os pontos das duplas são somados." />
        </Section>

        {/* Dicas */}
        <Section title="Dicas Estratégicas">
          <Rule text="Guarda os trunfos para momentos decisivos — não os gastes logo." />
          <Rule text="O Às e o 5 (Nova Manilha) valem muitos pontos. Tenta capturá-los." />
          <Rule text="Atenção às cartas já jogadas — sabe o que ainda está em jogo." />
          <Rule text="Em duplas, coordena com o teu parceiro para gerir os pontos." />
          <Rule text="A troca do 7 pode ser muito vantajosa se a carta de trunfo for forte." />
        </Section>

        <View style={s.footer}>
          <Text style={s.footerText}>Bisca 61 · Nova Manilha · Multijogador</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: THEME.bg },
  scroll:         { padding: 20, paddingBottom: 40 },

  section:        { marginBottom: 24 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 12, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: THEME.green },

  ruleRow:        { flexDirection: 'row', gap: 8, marginBottom: 7 },
  ruleDot:        { color: THEME.green, fontSize: 14, lineHeight: 20, marginTop: 1 },
  ruleText:       { flex: 1, color: THEME.text, fontSize: 14, lineHeight: 22 },

  tagRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
  tag:            { backgroundColor: THEME.greenL, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, alignItems: 'center' },
  tagText:        { color: THEME.green, fontWeight: '800', fontSize: 13 },
  tagNote:        { color: THEME.text, fontSize: 14 },

  suitGrid:       { flexDirection: 'row', gap: 10 },
  suitCard:       { flex: 1, backgroundColor: THEME.surface, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
  suitSymbol:     { fontSize: 28 },
  suitName:       { color: THEME.textSoft, fontSize: 11, marginTop: 4, fontWeight: '600' },

  strengthBox:    { backgroundColor: THEME.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: THEME.border },
  strengthBoxRed: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  strengthLabel:  { color: THEME.textSoft, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  strengthSeq:    { color: THEME.text, fontSize: 15, fontWeight: '700', letterSpacing: 1 },

  note:           { color: THEME.textMute, fontSize: 12, fontStyle: 'italic', marginTop: 4, lineHeight: 18 },

  footer:         { alignItems: 'center', marginTop: 8 },
  footerText:     { color: THEME.textMute, fontSize: 12 },
})
