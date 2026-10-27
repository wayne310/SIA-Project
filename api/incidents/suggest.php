<?php
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

$auth = requireAuth();
if ($auth['user']['role'] !== 'admin') {
    jsonResponse(403, ['error' => 'Admin access required']);
}

$incidentId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$incidentId) {
    jsonResponse(400, ['error' => 'Incident id is required']);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare(
    'SELECT i.description, c.category_name
     FROM incidents i
     JOIN categories c ON c.category_id = i.category_id
     WHERE i.incident_id = ?
     LIMIT 1'
);
$stmt->execute([$incidentId]);
$incident = $stmt->fetch();
if (!$incident) {
    jsonResponse(404, ['error' => 'Incident not found']);
}

$priority = classifyIncidentRisk($incident['category_name'], $incident['description']);
$pdo->beginTransaction();
try {
    $update = $pdo->prepare('UPDATE incidents SET ai_priority = ?, updated_at = NOW() WHERE incident_id = ?');
    $update->execute([$priority, $incidentId]);
    recordIncidentHistory(
        $pdo,
        $incidentId,
        displayIncidentActor($auth['user']),
        'AI suggestion generated: ' . $priority
    );
    $pdo->commit();
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('AI suggestion save failed: ' . $error->getMessage());
    jsonResponse(500, ['error' => 'AI suggestion could not be saved']);
}

jsonResponse(200, ['ai_priority' => $priority]);
