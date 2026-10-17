<?php
require_once __DIR__ . '/config.php';

$pdo = getDbConnection();

$categories = $pdo->query('SELECT * FROM categories ORDER BY category_id ASC')->fetchAll();
$statusList = $pdo->query('SELECT * FROM status ORDER BY status_id ASC')->fetchAll();

jsonResponse(200, [
    'categories' => $categories,
    'status' => $statusList,
]);
