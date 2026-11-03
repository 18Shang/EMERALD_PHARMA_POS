<?php
// api/low_stock_submit.php
// Saves a restock report submitted by staff/admin
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';

$input = json_decode(file_get_contents('php://input'), true);
$reported_by = $conn->real_escape_string($input['reported_by'] ?? '');
$role        = $conn->real_escape_string($input['role']        ?? 'staff');
$priority    = $conn->real_escape_string($input['priority']    ?? 'normal');
$notes       = $conn->real_escape_string($input['notes']       ?? '');
$date        = date('Y-m-d H:i:s');

if (!$reported_by) {
    echo json_encode(['success' => false, 'message' => 'Reporter name required.']);
    exit;
}

$sql = "INSERT INTO low_stock_reports (reported_by, role, priority, notes, created_at)
        VALUES ('$reported_by', '$role', '$priority', '$notes', '$date')";

if ($conn->query($sql)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => $conn->error]);
}