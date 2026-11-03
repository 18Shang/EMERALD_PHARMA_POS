<?php
// ============================================================
//  get_cashier_info.php — Returns logged-in cashier's info
//  Location: api/get_cashier_info.php
// ============================================================
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";
if (session_status() === PHP_SESSION_NONE) session_start();

$user_id = intval($_SESSION['user_id'] ?? 0);

if ($user_id > 0) {
    $q = $conn->query("SELECT id, username, fullname, role FROM users WHERE id = $user_id LIMIT 1");
    if ($q && $row = $q->fetch_assoc()) {
        echo json_encode([
            'success'  => true,
            'id'       => $row['id'],
            'username' => $row['username'] ?: $row['fullname'] ?: 'Cashier',
            'fullname' => $row['fullname'] ?: '',
            'role'     => $row['role']     ?: 'cashier'
        ]);
        exit;
    }
}

// Not logged in or user not found — return safe default
echo json_encode(['success' => false, 'username' => 'Cashier', 'fullname' => '', 'role' => 'cashier']);
?>