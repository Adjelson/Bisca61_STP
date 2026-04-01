<?php
// ─── CONFIG ──────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'bisca61');
define('DB_USER', 'root');       // altere conforme necessário
define('DB_PASS', '');           // altere conforme necessário

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4",
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, X-Token');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_session(): ?array {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? $_COOKIE['bisca_token'] ?? null;
    if (!$token) return null;
    $st = db()->prepare("SELECT * FROM sessoes WHERE token=?");
    $st->execute([$token]);
    return $st->fetch() ?: null;
}

function require_session(): array {
    $s = get_session();
    if (!$s) json_out(['erro' => 'Não autenticado'], 401);
    return $s;
}

function rand_str(int $n): string {
    return substr(bin2hex(random_bytes($n)), 0, $n);
}
