<?php
require_once __DIR__.'/db.php';
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Token');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';

// ─── ENTRAR / REGISTAR ───────────────────────────────────────────────────────
if ($action === 'entrar') {
    $username = trim($body['username'] ?? '');
    $avatar   = intval($body['avatar'] ?? 1);

    if (strlen($username) < 2 || strlen($username) > 24)
        json_out(['erro' => 'Username deve ter 2-24 caracteres']);

    $username = preg_replace('/[^a-zA-Z0-9_\-]/', '', $username);
    if (!$username) json_out(['erro' => 'Username inválido']);

    $db = db();

    // Upsert utilizador
    $st = $db->prepare("INSERT INTO utilizadores (username, avatar) VALUES (?,?)
        ON DUPLICATE KEY UPDATE avatar=VALUES(avatar)");
    $st->execute([$username, $avatar]);

    $st = $db->prepare("SELECT id FROM utilizadores WHERE username=?");
    $st->execute([$username]);
    $user = $st->fetch();

    // Criar sessão
    $token = rand_str(48);
    $db->prepare("DELETE FROM sessoes WHERE user_id=?")->execute([$user['id']]);
    $db->prepare("INSERT INTO sessoes (token, user_id, username, avatar) VALUES (?,?,?,?)")
       ->execute([$token, $user['id'], $username, $avatar]);

    setcookie('bisca_token', $token, time()+86400*30, '/', '', false, true);
    json_out(['ok' => true, 'token' => $token, 'username' => $username, 'avatar' => $avatar]);
}

// ─── PERFIL ──────────────────────────────────────────────────────────────────
if ($action === 'perfil') {
    $sess = require_session();
    $st = db()->prepare("SELECT username, avatar, vitorias, derrotas, match_pts FROM utilizadores WHERE id=?");
    $st->execute([$sess['user_id']]);
    $u = $st->fetch();
    json_out(['ok' => true, 'user' => $u]);
}

// ─── SAIR ────────────────────────────────────────────────────────────────────
if ($action === 'sair') {
    $sess = get_session();
    if ($sess) db()->prepare("DELETE FROM sessoes WHERE token=?")->execute([$sess['token']]);
    setcookie('bisca_token', '', time()-1, '/');
    json_out(['ok' => true]);
}

json_out(['erro' => 'Ação desconhecida'], 400);
