<?php
require_once __DIR__ . '/config.php';

$auth = requireAuth();
if ($auth['user']['role'] !== 'super_admin') {
    jsonResponse(403, ['error' => 'Super admin access required']);
}

$pdo = getDbConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query('SELECT user_id, first_name, last_name, email, phone, address, role, created_at FROM users ORDER BY created_at DESC');
    jsonResponse(200, ['users' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = readJsonBody();
    $firstName = trim((string)($data['first_name'] ?? ''));
    $lastName = trim((string)($data['last_name'] ?? ''));
    $email = strtolower(trim((string)($data['email'] ?? '')));
    $password = (string)($data['password'] ?? '');
    $phone = trim((string)($data['phone'] ?? ''));
    $address = trim((string)($data['address'] ?? ''));

    if (!$firstName || !$lastName || !$email || strlen($password) < 6) {
        jsonResponse(400, ['error' => 'First name, last name, valid email, and password (minimum 6 characters) are required.']);
    }

    $check = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        jsonResponse(409, ['error' => 'Email already registered']);
    }

    $insert = $pdo->prepare('INSERT INTO users (first_name, last_name, email, password, phone, address, role, created_at) VALUES (?, ?, ?, ?, ?, ?, "admin", NOW())');
    $insert->execute([$firstName, $lastName, $email, password_hash($password, PASSWORD_DEFAULT), $phone, $address]);
    $userId = $pdo->lastInsertId();

    $created = $pdo->prepare('SELECT user_id, first_name, last_name, email, phone, address, role, created_at FROM users WHERE user_id = ? LIMIT 1');
    $created->execute([$userId]);
    jsonResponse(201, ['message' => 'Admin account created successfully', 'user' => $created->fetch()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $userId = (int)($_GET['id'] ?? 0);
    if (!$userId) {
        jsonResponse(400, ['error' => 'User id is required']);
    }
    if ($userId === (int)$auth['user']['user_id']) {
        jsonResponse(400, ['error' => 'You cannot delete your own account']);
    }

    $target = $pdo->prepare('SELECT user_id, role FROM users WHERE user_id = ? LIMIT 1');
    $target->execute([$userId]);
    $user = $target->fetch();
    if (!$user) {
        jsonResponse(404, ['error' => 'User not found']);
    }
    if ($user['role'] === 'super_admin') {
        jsonResponse(403, ['error' => 'Super admin accounts cannot be deleted here']);
    }

    $delete = $pdo->prepare('DELETE FROM users WHERE user_id = ?');
    $delete->execute([$userId]);
    jsonResponse(200, ['message' => 'User deleted successfully']);
}

jsonResponse(405, ['error' => 'Method not allowed']);
