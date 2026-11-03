<?php
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

$input    = file_get_contents("php://input");
$data     = json_decode($input, true);
$email    = trim($data['email']    ?? '');
$password = trim($data['password'] ?? '');

if (empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Email and password are required."]);
    exit;
}

$email_esc = $conn->real_escape_string($email);

// customers table uses: full_name, email, password
$q = $conn->query("SELECT * FROM customers WHERE email = '$email_esc' LIMIT 1");

if (!$q || $q->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Account not found."]);
    exit;
}

$customer = $q->fetch_assoc();

// Verify password (bcrypt)
if (!password_verify($password, $customer['password'])) {
    echo json_encode(["status" => "error", "message" => "Incorrect password."]);
    exit;
}

// ── Return full_name as "name" — this is what homepage.dart reads ──
echo json_encode([
    "status"   => "success",
    "id"       => $customer['id'],
    "name"     => $customer['full_name'],   // ← homepage.dart: data["name"]
    "username" => $customer['full_name'],   // ← backup
    "email"    => $customer['email'],
    "message"  => "Login successful."
]);
?>