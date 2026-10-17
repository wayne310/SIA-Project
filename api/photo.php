<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

$auth = requireAuth();
$photoId = isset($_GET['photo_id']) ? (int)$_GET['photo_id'] : 0;
if (!$photoId) {
    jsonResponse(400, ['error' => 'Photo id is required']);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT ip.photo_path, i.user_id FROM incident_photos ip JOIN incidents i ON i.incident_id = ip.incident_id WHERE ip.photo_id = ? LIMIT 1');
$stmt->execute([$photoId]);
$photo = $stmt->fetch();
if (!$photo) {
    jsonResponse(404, ['error' => 'Photo not found']);
}

$role = strtolower((string)$auth['user']['role']);
if (!in_array($role, ['admin', 'super_admin'], true) && (int)$photo['user_id'] !== (int)$auth['user']['user_id']) {
    jsonResponse(403, ['error' => 'Access denied']);
}

$filename = basename((string)$photo['photo_path']);
if (!preg_match('/\A[a-f0-9]{32}\.(?:jpeg|png|gif|webp)\z/i', $filename)) {
    jsonResponse(404, ['error' => 'Photo not found']);
}

$path = __DIR__ . '/uploads/incidents/' . $filename;
$imageInfo = is_file($path) ? @getimagesize($path) : false;
if (!$imageInfo || !in_array($imageInfo['mime'] ?? '', ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true)) {
    jsonResponse(404, ['error' => 'Photo not found']);
}

header('Content-Type: ' . $imageInfo['mime']);
header('Content-Length: ' . filesize($path));
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
readfile($path);
exit;