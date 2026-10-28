<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Method not allowed']);
}

$data = readJsonBody();
requireTurnstile($data['cf-turnstile-response'] ?? null, 'signup');
$firstName = trim((string)($data['first_name'] ?? ''));
$lastName = trim((string)($data['last_name'] ?? ''));
$legacyName = trim((string)($data['full_name'] ?? $data['name'] ?? ''));
if ((!$firstName || !$lastName) && $legacyName) {
    $nameParts = preg_split('/\s+/', $legacyName, 2);
    $firstName = $firstName ?: ($nameParts[0] ?? '');
    $lastName = $lastName ?: ($nameParts[1] ?? '');
}
$email = strtolower(trim((string)($data['email'] ?? '')));
$password = (string)($data['password'] ?? '');
$phone = trim((string)($data['phone'] ?? ''));
$street = trim((string)($data['street'] ?? ''));
$barangay = trim((string)($data['barangay'] ?? ''));
$city = trim((string)($data['city'] ?? ''));
$province = trim((string)($data['province'] ?? ''));
$birthday = trim((string)($data['birthday'] ?? ''));
$nationality = trim((string)($data['nationality'] ?? ''));
$termsAccepted = ($data['terms_accepted'] ?? false) === true;
$role = 'resident';

$textOnly = static function (string $value): bool {
    return preg_match("/^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]*$/u", $value) === 1;
};

if (!$firstName || strlen($firstName) > 75 || !$lastName || strlen($lastName) > 75
    || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150
    || strlen($password) < 6 || !$nationality || strlen($nationality) > 100
    || !$textOnly($firstName) || !$textOnly($lastName) || !$textOnly($nationality)
    || !$barangay || strlen($barangay) > 100 || !$textOnly($barangay)
    || !$city || strlen($city) > 100 || !$textOnly($city)
    || !$province || strlen($province) > 100 || !$textOnly($province)) {
    jsonResponse(400, ['error' => 'Enter valid names, location, and nationality using letters only, a valid email, and a password of at least 6 characters.']);
}

if (!$street || strlen($street) > 255) {
    jsonResponse(400, ['error' => 'A valid street address is required.']);
}

if (!$termsAccepted) {
    jsonResponse(400, ['error' => 'You must agree to the Terms and Conditions to register.']);
}

$address = "{$street}, {$barangay}, {$city}, {$province}";

$birthDate = DateTimeImmutable::createFromFormat('!Y-m-d', $birthday);
$dateErrors = DateTimeImmutable::getLastErrors();
if (!$birthDate || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count']))
    || $birthDate->format('Y-m-d') !== $birthday || $birthDate > new DateTimeImmutable('today')) {
    jsonResponse(400, ['error' => 'A valid birthday is required.']);
}

if ($birthDate->diff(new DateTimeImmutable('today'))->y < 18) {
    jsonResponse(400, ['error' => 'You must be at least 18 years old to register.']);
}

$pdo = getDbConnection();
$stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonResponse(409, ['error' => 'Email already registered']);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$insert = $pdo->prepare('INSERT INTO users (first_name, last_name, email, password, phone, address, birthday, nationality, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
$insert->execute([$firstName, $lastName, $email, $hash, $phone, $address, $birthday, $nationality, $role]);
$userId = $pdo->lastInsertId();

$user = $pdo->prepare('SELECT user_id, first_name, last_name, email, phone, address, role, created_at FROM users WHERE user_id = ? LIMIT 1');
$user->execute([$userId]);
$created = $user->fetch();

jsonResponse(201, ['message' => 'User registered successfully', 'user' => $created]);
