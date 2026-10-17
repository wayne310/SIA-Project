<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $auth = requireAuth();
    $pdo = getDbConnection();
    $incidentId = (int)str_replace(['.php', '/'], '', basename($_SERVER['REQUEST_URI']));

    $stmt = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $stmt->execute([$incidentId]);
    $incident = $stmt->fetch();

    if (!$incident) {
        jsonResponse(404, ['error' => 'Incident not found']);
    }

    if ($auth['user']['role'] !== 'admin' && $incident['user_id'] !== $auth['user']['user_id']) {
        jsonResponse(403, ['error' => 'Access denied']);
    }

    $photoStmt = $pdo->prepare('SELECT * FROM incident_photos WHERE incident_id = ? ORDER BY photo_id ASC');
    $photoStmt->execute([$incidentId]);
    $incident['photos'] = $photoStmt->fetchAll();

    jsonResponse(200, ['incident' => $incident]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $auth = requireAuth();
    $pdo = getDbConnection();

    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    $incidentId = (int)end($parts);

    $data = readJsonBody();
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

    $incidentCheck = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $incidentCheck->execute([$incidentId]);
    $incident = $incidentCheck->fetch();

    if (!$incident) {
        jsonResponse(404, ['error' => 'Incident not found']);
    }

    if ($auth['user']['role'] !== 'admin' && $incident['user_id'] !== $auth['user']['user_id']) {
        jsonResponse(403, ['error' => 'Access denied']);
    }

    $params[] = $incidentId;
    $stmt = $pdo->prepare('UPDATE incidents SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE incident_id = ?');
    $stmt->execute($params);

    jsonResponse(200, ['message' => 'Incident updated successfully']);
}

jsonResponse(405, ['error' => 'Method not allowed']);
