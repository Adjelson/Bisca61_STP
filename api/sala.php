<?php
require_once __DIR__.'/db.php';
require_once __DIR__.'/engine.php';
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? ($_GET['action'] ?? '');
$sess   = require_session();

// ─── CRIAR SALA ──────────────────────────────────────────────────────────────
if ($action === 'criar') {
    $num = intval($body['num'] ?? 2);
    if (!in_array($num, [2,4])) json_out(['erro' => 'Número de jogadores inválido']);

    $db   = db();
    $code = strtoupper(rand_str(6));

    $db->prepare("INSERT INTO salas (codigo, num_jogadores, host_id) VALUES (?,?,?)")
       ->execute([$code, $num, $sess['user_id']]);

    // Inserir como slot 0
    $db->prepare("INSERT INTO jogadores (sala_codigo, user_id, username, avatar, slot) VALUES (?,?,?,?,0)")
       ->execute([$code, $sess['user_id'], $sess['username'], $sess['avatar']]);

    json_out(['ok' => true, 'codigo' => $code, 'num' => $num]);
}

// ─── ENTRAR SALA ─────────────────────────────────────────────────────────────
if ($action === 'entrar_sala') {
    $code = strtoupper(trim($body['codigo'] ?? ''));
    $db   = db();

    $sala = $db->prepare("SELECT * FROM salas WHERE codigo=?");
    $sala->execute([$code]);
    $sala = $sala->fetch();
    if (!$sala) json_out(['erro' => 'Sala não encontrada']);
    if ($sala['estado'] !== 'aguardando') json_out(['erro' => 'Jogo já iniciado']);

    // Verificar se já está na sala
    $existente = $db->prepare("SELECT slot FROM jogadores WHERE sala_codigo=? AND user_id=?");
    $existente->execute([$code, $sess['user_id']]);
    if ($existente->fetch()) json_out(['ok' => true, 'codigo' => $code, 'ja_esta' => true]);

    // Contar slots usados
    $count = $db->prepare("SELECT COUNT(*) as n FROM jogadores WHERE sala_codigo=?");
    $count->execute([$code]);
    $n = $count->fetch()['n'];
    if ($n >= $sala['num_jogadores']) json_out(['erro' => 'Sala cheia']);

    // Próximo slot livre
    $slots = $db->prepare("SELECT slot FROM jogadores WHERE sala_codigo=? ORDER BY slot");
    $slots->execute([$code]);
    $usados = array_column($slots->fetchAll(), 'slot');
    $slot = 0;
    while (in_array($slot, $usados)) $slot++;

    $db->prepare("INSERT INTO jogadores (sala_codigo, user_id, username, avatar, slot) VALUES (?,?,?,?,?)")
       ->execute([$code, $sess['user_id'], $sess['username'], $sess['avatar'], $slot]);

    json_out(['ok' => true, 'codigo' => $code]);
}

// ─── INICIAR JOGO ────────────────────────────────────────────────────────────
if ($action === 'iniciar') {
    $code = strtoupper($body['codigo'] ?? '');
    $db   = db();

    $sala = $db->prepare("SELECT * FROM salas WHERE codigo=? AND host_id=?");
    $sala->execute([$code, $sess['user_id']]);
    $sala = $sala->fetch();
    if (!$sala) json_out(['erro' => 'Sem permissão']);

    $jogs = $db->prepare("SELECT user_id, username, avatar, slot FROM jogadores WHERE sala_codigo=? ORDER BY slot");
    $jogs->execute([$code]);
    $jogs = $jogs->fetchAll();

    if (count($jogs) < $sala['num_jogadores']) json_out(['erro' => 'Faltam jogadores']);

    $uids = array_column($jogs, 'user_id');
    $uids = array_map('intval', $uids);
    $estado = BiscaEngine::novo($uids, (int)$sala['num_jogadores']);

    $db->prepare("REPLACE INTO estado_jogo (sala_codigo, estado_json) VALUES (?,?)")
       ->execute([$code, json_encode($estado)]);
    $db->prepare("UPDATE salas SET estado='jogando' WHERE codigo=?")->execute([$code]);

    json_out(['ok' => true]);
}

// ─── TROCAR 7 PELO TRUNFO ────────────────────────────────────────────────────
if ($action === 'trocar_sete') {
    $code = strtoupper($body['codigo'] ?? '');
    $db   = db();
    $row  = $db->prepare("SELECT estado_json FROM estado_jogo WHERE sala_codigo=?");
    $row->execute([$code]);
    $row  = $row->fetch();
    if (!$row) json_out(['erro' => 'Estado não encontrado']);
    $st = json_decode($row['estado_json'], true);
    try {
        $st = BiscaEngine::trocarSete($st, (int)$sess['user_id']);
    } catch (\Exception $e) {
        json_out(['erro' => $e->getMessage()]);
    }
    $db->prepare("UPDATE estado_jogo SET estado_json=? WHERE sala_codigo=?")
       ->execute([json_encode($st), $code]);
    json_out(['ok' => true]);
}


if ($action === 'jogar') {
    $code  = strtoupper($body['codigo'] ?? '');
    $carta = $body['carta'] ?? null;
    if (!$carta || !isset($carta['s'], $carta['r'])) json_out(['erro' => 'Carta inválida']);

    $db = db();
    $row = $db->prepare("SELECT estado_json FROM estado_jogo WHERE sala_codigo=?");
    $row->execute([$code]);
    $row = $row->fetch();
    if (!$row) json_out(['erro' => 'Estado não encontrado']);

    $st = json_decode($row['estado_json'], true);

    try {
        $st = BiscaEngine::jogar($st, (int)$sess['user_id'], $carta);
    } catch (\Exception $e) {
        json_out(['erro' => $e->getMessage()]);
    }

    // Atualizar stats se fim
    if ($st['fase'] === 'fim' && $st['vencedor'] !== null) {
        $db->prepare("UPDATE salas SET estado='fim' WHERE codigo=?")->execute([$code]);
        // Atualizar estatísticas dos jogadores
        foreach ($st['jogadores'] as $uid) {
            $eq = BiscaEngine::equipaDeUid($st, $uid);
            if ($st['vencedor'] === -1) continue; // empate
            if ($eq === $st['vencedor']) {
                $db->prepare("UPDATE utilizadores SET vitorias=vitorias+1, match_pts=match_pts+3 WHERE id=?")->execute([$uid]);
            } else {
                $db->prepare("UPDATE utilizadores SET derrotas=derrotas+1 WHERE id=?")->execute([$uid]);
            }
        }
    }

    $db->prepare("UPDATE estado_jogo SET estado_json=? WHERE sala_codigo=?")
       ->execute([json_encode($st), $code]);

    json_out(['ok' => true]);
}

// ─── ESTADO (POLLING) ────────────────────────────────────────────────────────
if ($action === 'estado') {
    $code = strtoupper($_GET['codigo'] ?? $body['codigo'] ?? '');
    $db   = db();

    $sala = $db->prepare("SELECT * FROM salas WHERE codigo=?");
    $sala->execute([$code]);
    $sala = $sala->fetch();
    if (!$sala) json_out(['erro' => 'Sala não encontrada']);

    $jogs = $db->prepare("SELECT user_id, username, avatar, slot FROM jogadores WHERE sala_codigo=? ORDER BY slot");
    $jogs->execute([$code]);
    $jogs = $jogs->fetchAll();

    $result = [
        'sala'     => $sala,
        'jogadores'=> $jogs,
        'num'      => (int)$sala['num_jogadores'],
    ];

    if ($sala['estado'] !== 'aguardando') {
        $row = $db->prepare("SELECT estado_json, atualizado FROM estado_jogo WHERE sala_codigo=?");
        $row->execute([$code]);
        $row = $row->fetch();
        if ($row) {
            $st  = json_decode($row['estado_json'], true);
            $uid = (int)$sess['user_id'];

            // Filtrar: só enviar a mão do próprio jogador
            $mao_propria = $st['maos'][$uid] ?? [];
            $maos_count  = [];
            foreach ($st['maos'] as $u => $m) $maos_count[$u] = count($m);

            $result['estado'] = [
                'fase'              => $st['fase'],
                'vez'               => $st['vez'],
                'vez_uid'           => $st['jogadores'][$st['vez']],
                'mao'               => $mao_propria,
                'maos_count'        => $maos_count,
                'deck_count'        => count($st['deck']),
                'trunfo_naipe'      => $st['trunfo_naipe'],
                'trunfo_carta'      => $st['trunfo_carta'],
                'trunfo_horizontal' => $st['trunfo_horizontal'] ?? null,
                'trunfo_rotacao'    => $st['trunfo_rotacao'],
                'trunfo_idx'        => $st['trunfo_idx'],
                'vaza_num'          => $st['vaza_num'] ?? 0,
                'mesa'              => $st['mesa'],
                'pontos'            => $st['pontos'],
                'vazas'             => $st['vazas'],
                'equipas'           => $st['equipas'],
                'jogadores'         => $st['jogadores'],
                'historico'         => $st['historico'] ?? null,
                'vencedor'          => $st['vencedor'] ?? null,
                'atualizado'        => $row['atualizado'],
            ];
        }
    }

    json_out($result);
}

// ─── LISTAR SALAS ABERTAS ────────────────────────────────────────────────────
if ($action === 'listar') {
    $db  = db();
    $st  = $db->prepare("
        SELECT s.codigo, s.num_jogadores, s.criado_em,
               COUNT(j.id) as ocupados
        FROM salas s
        LEFT JOIN jogadores j ON j.sala_codigo = s.codigo
        WHERE s.estado = 'aguardando'
        GROUP BY s.codigo
        HAVING ocupados < s.num_jogadores
        ORDER BY s.criado_em DESC LIMIT 20
    ");
    $st->execute();
    json_out(['salas' => $st->fetchAll()]);
}

// ─── SAIR DA SALA ────────────────────────────────────────────────────────────
if ($action === 'sair_sala') {
    $code = strtoupper($body['codigo'] ?? '');
    $db   = db();
    $db->prepare("DELETE FROM jogadores WHERE sala_codigo=? AND user_id=?")->execute([$code, $sess['user_id']]);
    // Se não restam jogadores, apagar sala
    $n = $db->prepare("SELECT COUNT(*) as n FROM jogadores WHERE sala_codigo=?");
    $n->execute([$code]);
    if ($n->fetch()['n'] == 0) {
        $db->prepare("DELETE FROM salas WHERE codigo=?")->execute([$code]);
        $db->prepare("DELETE FROM estado_jogo WHERE sala_codigo=?")->execute([$code]);
    }
    json_out(['ok' => true]);
}

json_out(['erro' => 'Ação desconhecida'], 400);
