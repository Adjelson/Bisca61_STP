<?php
// ─── MOTOR DE BISCA 61 — VARIANTE NOVA MANILHA ─────────────────────────────
//
// ALTERAÇÕES À VARIANTE CLÁSSICA:
//   • 5 = Nova Manilha (10 pontos, 2.º mais forte)
//   • 7 = Carta de Utilidade (0 pontos, força normal)
//   • Habilidade do 7 (Vira-Trunfo): antes de jogar, o jogador cuja vez é
//     pode trocar o seu 7 do naipe de trunfo pela carta de trunfo visível,
//     SE ambos forem do mesmo naipe. O 7 fica horizontal no topo do baralho.
//   • Trunfo Horizontal: o 7 trocado fica virado de lado no topo do monte
//     — o vencedor da vaza sabe que vai receber esse 7, e os outros vêem
//     que a carta seguinte é conhecida.
//
// FLUXO DAS 40 CARTAS:
//   • Baralho = 40 cartas embaralhadas
//   • 3 cartas a cada jogador → 1 carta virada como trunfo visível → resto no monte
//   • COMPRA: vencedor recebe o trunfo visível; restantes tiram do monte por ordem
//   • Nova carta de trunfo + rotação de naipe após cada compra (se há monte)

class BiscaEngine {

    const SUITS    = ['E','C','O','P'];
    const RANKS    = ['A','5','K','J','Q','6','7','4','3','2'];

    // 5 vale 10 pts (nova manilha); 7 vale 0 pts
    const POINTS   = ['A'=>11,'5'=>10,'K'=>4,'J'=>3,'Q'=>2,
                      '6'=>0,'7'=>0,'4'=>0,'3'=>0,'2'=>0];

    // Ordem de força: A > 5 > K > J > Q > 6 > 7 > 4 > 3 > 2
    const STRENGTH = ['A'=>10,'5'=>9,'K'=>8,'J'=>7,'Q'=>6,
                      '6'=>5,'7'=>4,'4'=>3,'3'=>2,'2'=>1];

    // ── NOVO JOGO ─────────────────────────────────────────────────────────────
    static function novo(array $jogadores, int $num): array {
        $deck = self::baralhar();

        $maos = [];
        foreach ($jogadores as $uid)
            $maos[$uid] = [array_shift($deck), array_shift($deck), array_shift($deck)];

        $trunfo_carta = array_shift($deck);
        $trunfo_naipe = $trunfo_carta['s'];

        // Rotação de naipes (começa pelo naipe virado)
        $rotacao = self::SUITS;
        shuffle($rotacao);
        $pos = array_search($trunfo_naipe, $rotacao);
        if ($pos !== false && $pos !== 0) {
            array_splice($rotacao, $pos, 1);
            array_unshift($rotacao, $trunfo_naipe);
        }

        $equipas = $num === 4
            ? [0=>[$jogadores[0],$jogadores[2]], 1=>[$jogadores[1],$jogadores[3]]]
            : [0=>[$jogadores[0]],               1=>[$jogadores[1]]];

        return [
            'fase'              => 'jogando',
            'num'               => $num,
            'jogadores'         => $jogadores,
            'equipas'           => $equipas,
            'maos'              => $maos,
            'deck'              => $deck,
            'trunfo_carta'      => $trunfo_carta,
            'trunfo_naipe'      => $trunfo_naipe,
            'trunfo_rotacao'    => $rotacao,
            'trunfo_idx'        => 0,
            // Trunfo horizontal: quando o 7 é trocado, guardamos o 7 aqui
            // para ser visível no topo do monte de forma "horizontal"
            'trunfo_horizontal' => null,   // carta {s,r} ou null
            'vez'               => 0,
            'mesa'              => [],
            'pontos'            => [0=>0, 1=>0],
            'vazas'             => [0=>0, 1=>0],
            'vaza_num'          => 0,
            'historico'         => null,
            'vencedor'          => null,
        ];
    }

    // ── TROCAR 7 PELO TRUNFO (Habilidade Vira-Trunfo) ─────────────────────────
    // Pode ser chamada antes de jogar, apenas no turno do jogador.
    static function trocarSete(array $st, int $uid): array {
        if ($st['fase'] !== 'jogando')
            throw new \Exception('Jogo não está em curso');
        if ($st['jogadores'][$st['vez']] !== $uid)
            throw new \Exception('Não é a sua vez');
        if ($st['trunfo_carta'] === null)
            throw new \Exception('Não há carta de trunfo visível para trocar');

        $trunfo_naipe = $st['trunfo_naipe'];

        // Verificar se o jogador tem o 7 do naipe de trunfo
        $idx7 = null;
        foreach ($st['maos'][$uid] as $i => $c) {
            if ($c['r'] === '7' && $c['s'] === $trunfo_naipe) { $idx7 = $i; break; }
        }
        if ($idx7 === null)
            throw new \Exception('Não tens o 7 de trunfo para trocar');

        $sete = $st['maos'][$uid][$idx7];
        $trunfo_antigo = $st['trunfo_carta'];

        // Jogador recebe a carta de trunfo visível
        $st['maos'][$uid][$idx7] = $trunfo_antigo;

        // O 7 fica "horizontal" no topo do monte (visível a todos)
        $st['trunfo_horizontal'] = $sete;
        $st['trunfo_carta']      = null; // a carta visível foi para a mão

        return $st;
    }

    // ── JOGAR CARTA ───────────────────────────────────────────────────────────
    static function jogar(array $st, int $uid, array $carta): array {
        if ($st['fase'] !== 'jogando')
            throw new \Exception('Jogo não está em curso');
        if ($st['jogadores'][$st['vez']] !== $uid)
            throw new \Exception('Não é a sua vez');

        $idx = null;
        foreach ($st['maos'][$uid] as $i => $c) {
            if ($c['s'] === $carta['s'] && $c['r'] === $carta['r']) { $idx = $i; break; }
        }
        if ($idx === null) throw new \Exception('Carta inválida');

        array_splice($st['maos'][$uid], $idx, 1);
        $st['mesa'][] = ['uid' => $uid, 'carta' => $carta];

        if (count($st['mesa']) === $st['num'])
            $st = self::resolverVaza($st);
        else
            $st['vez'] = ($st['vez'] + 1) % $st['num'];

        return $st;
    }

    // ── RESOLVER VAZA ─────────────────────────────────────────────────────────
    private static function resolverVaza(array $st): array {
        $mesa        = $st['mesa'];
        $trunfo      = $st['trunfo_naipe'];
        $lider_naipe = $mesa[0]['carta']['s'];
        $venc_idx    = 0;

        for ($i = 1; $i < count($mesa); $i++) {
            if (self::ganha($mesa[$i]['carta'], $mesa[$venc_idx]['carta'], $lider_naipe, $trunfo))
                $venc_idx = $i;
        }

        $venc_uid = $mesa[$venc_idx]['uid'];
        $equipa   = self::equipaDeUid($st, $venc_uid);
        $vi       = array_search($venc_uid, $st['jogadores']);

        $pts = array_sum(array_map(fn($p) => self::POINTS[$p['carta']['r']], $mesa));
        $st['pontos'][$equipa] += $pts;
        $st['vazas'][$equipa]++;
        $st['vaza_num']++;

        $st['historico'] = [
            'venc_uid'      => $venc_uid,
            'cartas'        => $mesa,
            'pts'           => $pts,
            'trunfo_antigo' => $trunfo,
            'trunfo_novo'   => $trunfo,
        ];
        $st['mesa'] = [];

        // ── COMPRA ───────────────────────────────────────────────────────────
        $tem_trunfo    = ($st['trunfo_carta'] !== null);
        $tem_horiz     = ($st['trunfo_horizontal'] !== null);
        $tem_monte     = count($st['deck']) > 0;
        $tem_qualquer  = $tem_trunfo || $tem_horiz || $tem_monte;

        if ($tem_qualquer) {

            // 1. VENCEDOR: recebe trunfo visível → depois horizontal → depois monte
            if ($tem_trunfo) {
                $st['maos'][$venc_uid][] = $st['trunfo_carta'];
                $st['trunfo_carta'] = null;
            } elseif ($tem_horiz) {
                // Sem trunfo visível, o 7 horizontal é o "trunfo" que o vencedor recebe
                $st['maos'][$venc_uid][] = $st['trunfo_horizontal'];
                $st['trunfo_horizontal'] = null;
            } elseif ($tem_monte) {
                $st['maos'][$venc_uid][] = array_shift($st['deck']);
            }

            // 2. RESTANTES: tiram do monte por ordem
            //    Se havia horizontal, o 2.º jogador (logo a seguir ao vencedor)
            //    sabe que o próximo é o 7 — mas neste ponto o 7 já foi ao vencedor
            //    então tiram normalmente do monte
            for ($i = 1; $i < $st['num']; $i++) {
                $uid = $st['jogadores'][($vi + $i) % $st['num']];
                // Se ainda há um 7 horizontal e este é o 2.º a comprar:
                if ($st['trunfo_horizontal'] !== null && $i === 1) {
                    $st['maos'][$uid][] = $st['trunfo_horizontal'];
                    $st['trunfo_horizontal'] = null;
                } elseif (count($st['deck']) > 0) {
                    $st['maos'][$uid][] = array_shift($st['deck']);
                }
            }

            // 3. NOVA CARTA DE TRUNFO + rotação (se monte ainda tem cartas)
            if (count($st['deck']) > 0) {
                $rot     = $st['trunfo_rotacao'];
                $new_idx = ($st['trunfo_idx'] + 1) % count($rot);
                $st['trunfo_idx']  = $new_idx;
                $st['trunfo_naipe']= $rot[$new_idx];
                $st['trunfo_carta']= array_shift($st['deck']);
            }

            $st['historico']['trunfo_novo'] = $st['trunfo_naipe'];
        }

        // ── FIM? ─────────────────────────────────────────────────────────────
        $maos_vazias = true;
        foreach ($st['jogadores'] as $uid) {
            if (count($st['maos'][$uid]) > 0) { $maos_vazias = false; break; }
        }
        if ($maos_vazias) {
            $st['fase'] = 'fim';
            $st = self::calcularVencedor($st);
        } else {
            $st['vez'] = $vi;
        }
        return $st;
    }

    // ── REGRA DE VITÓRIA ──────────────────────────────────────────────────────
    static function ganha(array $a, array $atual, string $lider, string $trunfo): bool {
        if ($a['s'] === $atual['s'])
            return self::STRENGTH[$a['r']] > self::STRENGTH[$atual['r']];
        if ($a['s'] === $trunfo && $atual['s'] !== $trunfo) return true;
        if ($atual['s'] === $trunfo && $a['s'] !== $trunfo) return false;
        return false;
    }

    private static function calcularVencedor(array $st): array {
        $p0 = $st['pontos'][0]; $p1 = $st['pontos'][1];
        $st['vencedor'] = $p0 > $p1 ? 0 : ($p1 > $p0 ? 1 : -1);
        return $st;
    }

    static function equipaDeUid(array $st, int $uid): int {
        foreach ($st['equipas'] as $eq => $uids)
            if (in_array($uid, $uids)) return (int)$eq;
        return 0;
    }

    private static function baralhar(): array {
        $deck = [];
        foreach (self::SUITS as $s)
            foreach (self::RANKS as $r)
                $deck[] = ['s' => $s, 'r' => $r];
        shuffle($deck);
        return $deck;
    }
}
