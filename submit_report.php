<?php
// ============================================================
//  Emerald Pharmacy — Submit Report to Admin
//  Location: api/submit_report.php
// ============================================================
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

// ── Parse request body ────────────────────────────────────────
$input        = json_decode(file_get_contents('php://input'), true);
$start_date   = $input['start_date']   ?? '';
$end_date     = $input['end_date']     ?? '';
$transactions = $input['transactions'] ?? [];

if (!$start_date || !$end_date) {
    echo json_encode(['success' => false, 'message' => 'Date range is required.']);
    exit;
}
if (empty($transactions)) {
    echo json_encode(['success' => false, 'message' => 'No transactions to submit.']);
    exit;
}

// Sanitise dates
$start_date = preg_replace('/[^0-9\-]/', '', $start_date);
$end_date   = preg_replace('/[^0-9\-]/', '', $end_date);

// ── Get cashier info from session ─────────────────────────────
if (session_status() === PHP_SESSION_NONE) session_start();
$cashier_id = intval($_SESSION['user_id'] ?? 0);

// Look up real username from users table
$cashier_name = 'Cashier';
if ($cashier_id > 0) {
    $uq = $conn->query("SELECT username, fullname FROM users WHERE id = $cashier_id LIMIT 1");
    if ($uq && $row = $uq->fetch_assoc()) {
        $cashier_name = $row['username'] ?: ($row['fullname'] ?: 'Cashier');
    }
}
$cashier_name = $conn->real_escape_string($cashier_name);

// ── Calculate totals ──────────────────────────────────────────
$total_amount = 0;
foreach ($transactions as $t) {
    $total_amount += floatval($t['total'] ?? 0);
}
$txn_count    = count($transactions);
$total_amount = number_format($total_amount, 2, '.', '');

// ── Ensure cashier_reports table exists ──────────────────────
$conn->query("
    CREATE TABLE IF NOT EXISTS cashier_reports (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        cashier_id    INT          DEFAULT 0,
        cashier_name  VARCHAR(100) DEFAULT 'Cashier',
        start_date    DATE         NOT NULL,
        end_date      DATE         NOT NULL,
        total_amount  DECIMAL(12,2) DEFAULT 0,
        txn_count     INT           DEFAULT 0,
        submitted_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
        status        VARCHAR(20)   DEFAULT 'pending'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// ── Insert report ─────────────────────────────────────────────
$stmt = $conn->prepare("
    INSERT INTO cashier_reports
        (cashier_id, cashier_name, start_date, end_date, total_amount, txn_count)
    VALUES (?, ?, ?, ?, ?, ?)
");

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $conn->error]);
    exit;
}

$stmt->bind_param('isssdi',
    $cashier_id,
    $cashier_name,
    $start_date,
    $end_date,
    $total_amount,
    $txn_count
);

if ($stmt->execute()) {
    echo json_encode([
        'success'      => true,
        'message'      => 'Report submitted to admin successfully.',
        'report_id'    => $conn->insert_id,
        'cashier'      => $cashier_name,
        'total_amount' => $total_amount,
        'txn_count'    => $txn_count
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to save: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>