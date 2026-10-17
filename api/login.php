<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

$data = readJsonBody();
requireTurnstile($data['cf-turnstile-response'] ?? null, 'login');
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');

if (!$email || !$password) {
    jsonResponse(400, ['error' => 'Email and password are required']);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(401, ['error' => 'Invalid email or password']);
}

unset($user['password']);
$token = bin2hex(random_bytes(24));
$sessionStmt = $pdo->prepare('INSERT INTO user_sessions (user_id, token, login_time, logout_time) VALUES (?, ?, NOW(), NULL)');
$sessionStmt->execute([$user['user_id'], $token]);

$user['token'] = $token;
jsonResponse(200, ['user' => $user, 'token' => $token]);
