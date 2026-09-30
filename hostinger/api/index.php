<?php
/*
 * Novia Agency — API pour hébergement mutualisé (Hostinger, PHP 8+).
 * Même API que server.js : le site public et l'admin fonctionnent à l'identique.
 * Les données sont dans /private (protégé : .htaccess + fichiers .php non lisibles).
 */

declare(strict_types=1);

const PRIVATE_DIR = __DIR__ . '/../private';
const DB_FILE = PRIVATE_DIR . '/db.php';
const AUTH_FILE = PRIVATE_DIR . '/auth.php';
const ATTEMPTS_FILE = PRIVATE_DIR . '/attempts.php';
const GUARD = "<?php http_response_code(403); exit; ?>\n";
const COOKIE = 'novia_session';
const SESSION_DAYS = 14;
const COLLECTIONS = ['clients', 'shoots', 'videos', 'expenses', 'invoices', 'leads', 'events', 'tasks', 'collabs', 'sponsors', 'messages'];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

/* ---------- Stockage ---------- */

function read_store(string $file): ?array {
    if (!is_file($file)) return null;
    $raw = file_get_contents($file);
    if (str_starts_with($raw, GUARD)) $raw = substr($raw, strlen(GUARD));
    return json_decode($raw, true);
}

function write_store(string $file, $data): void {
    $tmp = $file . '.tmp';
    file_put_contents($tmp, GUARD . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
    rename($tmp, $file);
}

function load_db(): array {
    $db = read_store(DB_FILE);
    $seed = json_decode(file_get_contents(PRIVATE_DIR . '/seed.json'), true);
    if ($db === null) {
        write_store(DB_FILE, $seed);
        return $seed;
    }
    foreach (COLLECTIONS as $c) $db[$c] = $db[$c] ?? [];
    $db['settings'] = array_merge($seed['settings'], $db['settings'] ?? []);
    return $db;
}

function new_id(): string { return bin2hex(random_bytes(6)); }
function now_iso(): string { return gmdate('Y-m-d\TH:i:s.v\Z'); }

function out($data, int $status = 200): never {
    http_response_code($status);
    // Force {} pour les objets vides (sinon PHP écrit [])
    echo json_encode($data === [] ? new stdClass() : $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $msg, int $status): never { out(['error' => $msg], $status); }

function body() {
    $raw = file_get_contents('php://input');
    return $raw === '' ? [] : json_decode($raw, true);
}

/* ---------- Authentification ---------- */

function auth(): ?array { return read_store(AUTH_FILE); }

function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function set_cookie(string $value, int $maxAge): void {
    setcookie(COOKIE, $value, [
        'expires' => $maxAge > 0 ? time() + $maxAge : time() - 3600,
        'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => is_https(),
    ]);
}

function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64u_dec(string $s): string { return base64_decode(strtr($s, '-_', '+/')); }

function create_token(array $a): string {
    $payload = b64u(json_encode(['u' => $a['username'], 'exp' => (time() + SESSION_DAYS * 86400) * 1000]));
    return $payload . '.' . b64u(hash_hmac('sha256', $payload, $a['secret'], true));
}

function session_user(): ?string {
    $a = auth();
    $raw = $_COOKIE[COOKIE] ?? '';
    if (!$a || !str_contains($raw, '.')) return null;
    [$payload, $sig] = explode('.', $raw, 2);
    if (!hash_equals(b64u(hash_hmac('sha256', $payload, $a['secret'], true)), $sig)) return null;
    $data = json_decode(b64u_dec($payload), true);
    return ($data && $data['exp'] > time() * 1000) ? $data['u'] : null;
}

function require_auth(): string {
    $u = session_user();
    if (!$u) fail('Non connecté', 401);
    return $u;
}

function too_many_attempts(string $ip): bool {
    $all = read_store(ATTEMPTS_FILE) ?? [];
    $list = array_values(array_filter($all[$ip] ?? [], fn($t) => time() - $t < 900));
    return count($list) >= 8;
}

function record_attempt(string $ip, bool $success): void {
    $all = read_store(ATTEMPTS_FILE) ?? [];
    foreach ($all as $k => $list) {
        $all[$k] = array_values(array_filter($list, fn($t) => time() - $t < 900));
        if (!$all[$k]) unset($all[$k]);
    }
    if ($success) unset($all[$ip]);
    else $all[$ip][] = time();
    write_store(ATTEMPTS_FILE, $all ?: new stdClass());
}

/* ---------- Routage ---------- */

$method = $_SERVER['REQUEST_METHOD'];
$route = trim((string)($_GET['route'] ?? ''), '/');
if ($route === '') {
    // Repli si la réécriture ne passe pas le paramètre
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $route = trim(preg_replace('#^.*?/api/?#', '', $path), '/');
}
$parts = $route === '' ? [] : explode('/', $route);
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

// Premier lancement : création du compte admin depuis la page de connexion
if ($route === 'status' && $method === 'GET') out(['setup' => auth() === null]);

if ($route === 'setup' && $method === 'POST') {
    if (auth() !== null) fail('Compte déjà créé', 400);
    $b = body();
    $user = trim((string)($b['username'] ?? ''));
    $pass = (string)($b['password'] ?? '');
    if ($user === '' || strlen($pass) < 8) fail('Identifiant requis et mot de passe de 8 caractères minimum', 400);
    $a = ['username' => $user, 'hash' => password_hash($pass, PASSWORD_DEFAULT), 'secret' => bin2hex(random_bytes(32))];
    write_store(AUTH_FILE, $a);
    load_db();
    set_cookie(create_token($a), SESSION_DAYS * 86400);
    out(['ok' => true]);
}

if ($route === 'login' && $method === 'POST') {
    if (too_many_attempts($ip)) fail('Trop de tentatives, réessaie dans 15 minutes.', 429);
    $a = auth();
    $b = body();
    $ok = $a && is_string($b['username'] ?? null) && is_string($b['password'] ?? null)
        && strtolower(trim($b['username'])) === strtolower($a['username'])
        && password_verify($b['password'], $a['hash']);
    record_attempt($ip, $ok);
    if (!$ok) fail('Identifiants incorrects', 401);
    set_cookie(create_token($a), SESSION_DAYS * 86400);
    out(['ok' => true]);
}

if ($route === 'logout' && $method === 'POST') {
    set_cookie('', 0);
    out(['ok' => true]);
}

if ($route === 'me' && $method === 'GET') out(['username' => require_auth()]);

if ($route === 'password' && $method === 'POST') {
    require_auth();
    $a = auth();
    $b = body();
    if (!password_verify((string)($b['current'] ?? ''), $a['hash'])) fail('Mot de passe actuel incorrect', 400);
    if (!is_string($b['next'] ?? null) || strlen($b['next']) < 8) fail('8 caractères minimum', 400);
    $a['hash'] = password_hash($b['next'], PASSWORD_DEFAULT);
    write_store(AUTH_FILE, $a);
    out(['ok' => true]);
}

// Formulaire de contact public -> Admin > Messages
if ($route === 'contact' && $method === 'POST') {
    $b = body() ?: [];
    if (!empty($b['website'])) out(['ok' => true]); // pot de miel anti-spam
    $clean = fn($k, $max = 500) => mb_substr(trim((string)($b[$k] ?? '')), 0, $max);
    $msg = [
        'id' => new_id(), 'name' => $clean('name', 120), 'business' => $clean('business', 120),
        'email' => $clean('email', 160), 'phone' => $clean('phone', 40), 'city' => $clean('city', 80),
        'service' => $clean('service', 60), 'message' => $clean('message', 3000),
        'status' => 'Nouveau', 'createdAt' => now_iso(),
    ];
    if ($msg['name'] === '' || ($msg['email'] === '' && $msg['phone'] === '')) fail('Nom et email ou téléphone requis', 400);
    $db = load_db();
    array_unshift($db['messages'], $msg);
    write_store(DB_FILE, $db);
    out(['ok' => true]);
}

// Tout le reste nécessite d'être connecté
require_auth();
$db = load_db();

if ($route === 'data' && $method === 'GET') out($db);

if ($route === 'export' && $method === 'GET') {
    header('Content-Disposition: attachment; filename="novia-backup-' . date('Y-m-d') . '.json"');
    out($db);
}

if ($route === 'import' && $method === 'POST') {
    $data = body();
    if (!is_array($data) || empty($data['settings'])) fail('Fichier invalide', 400);
    foreach (COLLECTIONS as $c) if (!isset($data[$c]) || !is_array($data[$c])) $data[$c] = [];
    write_store(DB_FILE, $data);
    out(['ok' => true]);
}

if ($route === 'settings' && $method === 'PUT') {
    $db['settings'] = array_merge($db['settings'], body() ?: []);
    write_store(DB_FILE, $db);
    out($db['settings']);
}

if (($parts[0] ?? '') === 'data' && isset($parts[1])) {
    $col = $parts[1];
    if (!in_array($col, COLLECTIONS, true)) fail('Collection inconnue', 404);
    $id = $parts[2] ?? null;

    if ($id === null && $method === 'POST') {
        $b = body();
        $isList = is_array($b) && array_is_list($b) && $b !== [];
        $items = $isList ? $b : [$b ?: []];
        $created = array_map(fn($item) => array_merge($item, ['id' => new_id(), 'createdAt' => now_iso()]), $items);
        array_push($db[$col], ...$created);
        write_store(DB_FILE, $db);
        out($isList ? $created : $created[0]);
    }

    if ($id !== null && $method === 'PUT') {
        foreach ($db[$col] as $i => $item) {
            if ($item['id'] === $id) {
                $db[$col][$i] = array_merge($item, body() ?: [], ['id' => $item['id'], 'updatedAt' => now_iso()]);
                write_store(DB_FILE, $db);
                out($db[$col][$i]);
            }
        }
        fail('Introuvable', 404);
    }

    if ($id !== null && $method === 'DELETE') {
        $db[$col] = array_values(array_filter($db[$col], fn($x) => $x['id'] !== $id));
        write_store(DB_FILE, $db);
        out(['ok' => true]);
    }
}

fail('Route inconnue', 404);
