<?php
require_once __DIR__ . '/config.php';

function storeIncidentPhoto($photoData) {
    if (strlen($photoData) > 7 * 1024 * 1024
        || !preg_match('#^data:image/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$#', $photoData, $matches)) {
        jsonResponse(400, ['error' => 'Incident photo must be a JPEG, PNG, GIF, or WebP image under 5 MB']);
    }

    $image = base64_decode($matches[2], true);
    if ($image === false || strlen($image) > 5 * 1024 * 1024) {
        jsonResponse(400, ['error' => 'Incident photo must be under 5 MB']);
    }

    $imageInfo = getimagesizefromstring($image);
    $mimeTypes = [
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
    ];
    $extension = $matches[1];
    if (!$imageInfo || ($imageInfo['mime'] ?? '') !== $mimeTypes[$extension]) {
        jsonResponse(400, ['error' => 'Incident photo is not a valid supported image']);
    }

    $directory = __DIR__ . '/uploads/incidents';
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        jsonResponse(500, ['error' => 'Incident photo storage is unavailable']);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extension;
    if (@file_put_contents($directory . '/' . $filename, $image, LOCK_EX) === false) {
        jsonResponse(500, ['error' => 'Incident photo could not be stored']);
    }

    return $filename;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $auth = requireAuth();
    $user = $auth['user'];
    $pdo = getDbConnection();

    if ($user['role'] === 'admin') {
        $sql = "
                 SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) AS reporter_name, c.category_name, s.status_name,
                   (SELECT photo_path FROM incident_photos ip WHERE ip.incident_id = i.incident_id ORDER BY photo_id DESC LIMIT 1) AS photo_path
            FROM incidents i
                 LEFT JOIN users u ON u.user_id = i.user_id
            LEFT JOIN categories c ON c.category_id = i.category_id
            LEFT JOIN status s ON s.status_id = i.status_id
            ORDER BY i.created_at DESC
        ";
        $stmt = $pdo->prepare($sql);
    } else {
        $sql = "
                 SELECT i.*, CONCAT(u.first_name, ' ', u.last_name) AS reporter_name, c.category_name, s.status_name,
                   (SELECT photo_path FROM incident_photos ip WHERE ip.incident_id = i.incident_id ORDER BY photo_id DESC LIMIT 1) AS photo_path
            FROM incidents i
                 LEFT JOIN users u ON u.user_id = i.user_id
            LEFT JOIN categories c ON c.category_id = i.category_id
            LEFT JOIN status s ON s.status_id = i.status_id
            WHERE i.user_id = :user_id
            ORDER BY i.created_at DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':user_id', $user['user_id'], PDO::PARAM_INT);
    }

    $stmt->execute();
    $incidents = $stmt->fetchAll();

    foreach ($incidents as &$incident) {
        $photoStmt = $pdo->prepare('SELECT * FROM incident_photos WHERE incident_id = ? ORDER BY photo_id ASC');
        $photoStmt->execute([$incident['incident_id']]);
        $incident['photos'] = $photoStmt->fetchAll();
    }
    unset($incident);

    jsonResponse(200, ['incidents' => $incidents]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $auth = requireAuth();
    $user = $auth['user'];
    $data = readJsonBody();
    requireTurnstile($data['cf-turnstile-response'] ?? null, 'incident_submit');

    $categoryId = (int)($data['category_id'] ?? 0);
    $description = trim((string)($data['description'] ?? ''));
    $location = trim((string)($data['location'] ?? ''));
    $latitude = isset($data['latitude']) && $data['latitude'] !== '' ? (float)$data['latitude'] : null;
    $longitude = isset($data['longitude']) && $data['longitude'] !== '' ? (float)$data['longitude'] : null;
    $photoData = trim((string)($data['photo_data'] ?? ''));

    if (!$categoryId || !$description || strlen($description) > 5000 || !$location) {
        jsonResponse(400, ['error' => 'Category, description, and location are required']);
    }

    $pdo = getDbConnection();
    $categoryStmt = $pdo->prepare('SELECT category_name FROM categories WHERE category_id = ? LIMIT 1');
    $categoryStmt->execute([$categoryId]);
    $categoryName = $categoryStmt->fetchColumn();
    if (!$categoryName) {
        jsonResponse(400, ['error' => 'Incident category is invalid']);
    }

    $aiPriority = classifyIncidentRisk($categoryName, $description);
    $photoFilename = $photoData !== '' ? storeIncidentPhoto($photoData) : null;
    $statusId = 1;
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO incidents (user_id, category_id, description, location, latitude, longitude, ai_priority, verified_priority, verification_status, status_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, "Pending", ?, NOW(), NOW())');
        $stmt->execute([$user['user_id'], $categoryId, $description, $location, $latitude, $longitude, $aiPriority ?: 'Medium', $statusId]);
        $incidentId = $pdo->lastInsertId();

        if ($photoFilename !== null) {
            $photoStmt = $pdo->prepare('INSERT INTO incident_photos (incident_id, photo_path, uploaded_at, updated_at) VALUES (?, ?, NOW(), NOW())');
            $photoStmt->execute([$incidentId, $photoFilename]);
        }

        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($photoFilename !== null) @unlink(__DIR__ . '/uploads/incidents/' . $photoFilename);
        jsonResponse(500, ['error' => 'Incident report could not be saved']);
    }

    $createdStmt = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $createdStmt->execute([$incidentId]);
    $record = $createdStmt->fetch();
    $record['photos'] = [];

    if ($photoFilename !== null) {
        $photoQuery = $pdo->prepare('SELECT * FROM incident_photos WHERE incident_id = ? ORDER BY photo_id ASC');
        $photoQuery->execute([$incidentId]);
        $record['photos'] = $photoQuery->fetchAll();
    }

    jsonResponse(201, ['message' => 'Incident created', 'incident' => $record]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $auth = requireAuth();
    $data = readJsonBody();
    $pdo = getDbConnection();
    $incidentId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!$incidentId) {
        jsonResponse(400, ['error' => 'Incident id is required']);
    }

    $check = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $check->execute([$incidentId]);
    $incident = $check->fetch();

    if (!$incident) {
        jsonResponse(404, ['error' => 'Incident not found']);
    }

    if ($auth['user']['role'] !== 'admin' && $incident['user_id'] !== $auth['user']['user_id']) {
        jsonResponse(403, ['error' => 'Access denied']);
    }

    $allowed = ['status_id', 'verified_priority', 'verification_status', 'description', 'location', 'latitude', 'longitude'];
    $updates = [];
    $params = [];

    foreach ($data as $key => $value) {
        if (in_array($key, $allowed, true)) {
            $updates[] = "$key = ?";
            $params[] = $value;
        }
    }

    if (empty($updates)) {
        jsonResponse(400, ['error' => 'No valid fields to update']);
    }

    $params[] = $incidentId;
    $stmt = $pdo->prepare('UPDATE incidents SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE incident_id = ?');
    $stmt->execute($params);

    $updated = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $updated->execute([$incidentId]);
    jsonResponse(200, ['message' => 'Incident updated', 'incident' => $updated->fetch()]);
}

jsonResponse(405, ['error' => 'Method not allowed']);
