<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

$auth = requireAuth();
$pdo = getDbConnection();
$stmt = $pdo->prepare('UPDATE user_sessions SET logout_time = NOW() WHERE session_id = ? AND logout_time IS NULL');
$stmt->execute([$auth['session']['session_id']]);

jsonResponse(200, ['message' => 'Logged out successfully']);
