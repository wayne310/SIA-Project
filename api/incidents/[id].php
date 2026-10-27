<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $auth = requireAuth();
    $pdo = getDbConnection();
    $requestPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $incidentId = (int)str_replace('.php', '', basename($requestPath));

    $stmt = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $stmt->execute([$incidentId]);
    $incident = $stmt->fetch();

    if (!$incident) {
        jsonResponse(404, ['error' => 'Incident not found']);
    }

    if ($auth['user']['role'] !== 'admin' && (int)$incident['user_id'] !== (int)$auth['user']['user_id']) {
        jsonResponse(403, ['error' => 'Access denied']);
    }

    $photoStmt = $pdo->prepare('SELECT * FROM incident_photos WHERE incident_id = ? ORDER BY photo_id ASC');
    $photoStmt->execute([$incidentId]);
    $incident['photos'] = $photoStmt->fetchAll();
    $incident['history'] = fetchIncidentHistory($pdo, $incidentId);

    jsonResponse(200, ['incident' => $incident]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $auth = requireAuth();
    $pdo = getDbConnection();

    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    $incidentId = (int)str_replace('.php', '', end($parts));

    $data = readJsonBody();
    if (!$incidentId) {
        jsonResponse(400, ['error' => 'Incident id is required']);
    }

    $incidentCheck = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $incidentCheck->execute([$incidentId]);
    $incident = $incidentCheck->fetch();
    if (!$incident) {
        jsonResponse(404, ['error' => 'Incident not found']);
    }

    $isAdmin = $auth['user']['role'] === 'admin';
    if (!$isAdmin && (int)$incident['user_id'] !== (int)$auth['user']['user_id']) {
        jsonResponse(403, ['error' => 'Access denied']);
    }

    $adminFields = ['status_id', 'verified_priority', 'verification_status'];
    if (!$isAdmin && array_intersect($adminFields, array_keys($data))) {
        jsonResponse(403, ['error' => 'Only an admin can change incident status or verification']);
    }

    $allowed = $isAdmin
        ? array_merge($adminFields, ['description', 'location', 'latitude', 'longitude'])
        : ['description', 'location', 'latitude', 'longitude'];

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

    $newStatusName = null;
    if (array_key_exists('status_id', $data)) {
        $statusStmt = $pdo->prepare('SELECT status_name FROM status WHERE status_id = ? LIMIT 1');
        $statusStmt->execute([(int)$data['status_id']]);
        $newStatusName = $statusStmt->fetchColumn();
        if (!$newStatusName) {
            jsonResponse(400, ['error' => 'Incident status is invalid']);
        }
    }
    if (array_key_exists('verified_priority', $data)
        && !in_array($data['verified_priority'], ['Low', 'Medium', 'High', 'Critical'], true)) {
        jsonResponse(400, ['error' => 'Verified priority is invalid']);
    }
    if (array_key_exists('verification_status', $data)
        && !in_array($data['verification_status'], ['Pending', 'Verified'], true)) {
        jsonResponse(400, ['error' => 'Verification status is invalid']);
    }

    $params[] = $incidentId;
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('UPDATE incidents SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE incident_id = ?');
        $stmt->execute($params);

        $user = $auth['user'];
        $actorName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: 'User';
        if (array_key_exists('status_id', $data) && (int)$data['status_id'] !== (int)$incident['status_id']) {
            recordIncidentHistory($pdo, $incidentId, $actorName, 'Status changed to ' . $newStatusName);
        }
        $priorityChanged = array_key_exists('verified_priority', $data)
            && $data['verified_priority'] !== $incident['verified_priority'];
        $verificationChanged = array_key_exists('verification_status', $data)
            && $data['verification_status'] !== $incident['verification_status'];
        if ($priorityChanged || $verificationChanged) {
            $verificationStatus = $data['verification_status'] ?? $incident['verification_status'];
            $priority = $data['verified_priority'] ?? $incident['verified_priority'];
            $action = $verificationStatus === 'Verified' && $priority
                ? 'Priority verified as ' . $priority
                : 'Verification status changed to ' . $verificationStatus;
            recordIncidentHistory($pdo, $incidentId, $actorName, $action);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Incident update failed: ' . $error->getMessage());
        jsonResponse(500, ['error' => 'Incident could not be updated']);
    }

    $updated = $pdo->prepare('SELECT * FROM incidents WHERE incident_id = ? LIMIT 1');
    $updated->execute([$incidentId]);
    $record = $updated->fetch();
    $record['history'] = fetchIncidentHistory($pdo, $incidentId);
    jsonResponse(200, ['message' => 'Incident updated successfully', 'incident' => $record]);
}

jsonResponse(405, ['error' => 'Method not allowed']);
