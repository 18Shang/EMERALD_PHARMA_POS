<?php
// ============================================================
//  sales_report.php — Shared Sales Report API
//  Used by: cashier dashboard, admin dashboard, Flutter report
// ============================================================
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

// Accept both param naming styles
$start = $_GET['start_date'] ?? $_GET['from'] ?? '';
$end   = $_GET['end_date']   ?? $_GET['to']   ?? '';

// Sanitise
$start = preg_replace('/[^0-9\-]/', '', $start);
$end   = preg_replace('/[^0-9\-]/', '', $end);

// Build WHERE clause
$where = "s.status = 'Completed'";
if ($start && $end)   $where .= " AND DATE(s.sale_date) BETWEEN '$start' AND '$end'";
elseif ($start)       $where .= " AND DATE(s.sale_date) >= '$start'";
elseif ($end)         $where .= " AND DATE(s.sale_date) <= '$end'";

// Detect payment column
$pay_col = "'Cash'";
$chk = $conn->query("SHOW COLUMNS FROM sales LIKE 'payment_type'");
if ($chk && $chk->num_rows > 0) $pay_col = "IFNULL(s.payment_type,'Cash')";
else {
    $chk2 = $conn->query("SHOW COLUMNS FROM sales LIKE 'payment_method'");
    if ($chk2 && $chk2->num_rows > 0) $pay_col = "IFNULL(s.payment_method,'Cash')";
}

// JOIN users on cashier_id → get username (with fullname as fallback)
$q = $conn->query("
    SELECT
        s.id,
        s.receipt_no,
        IFNULL(s.customer_name,'Walk-in') AS customer_name,
        s.total,
        s.sale_date,
        s.status,
        $pay_col AS payment_type,
        IFNULL(u.username, IFNULL(u.fullname, 'Cashier')) AS cashier,
        GROUP_CONCAT(
            CONCAT(ti.quantity,'x ',IFNULL(p.name,'Product'))
            ORDER BY p.name SEPARATOR ', '
        ) AS medicines
    FROM sales s
    LEFT JOIN users u ON u.id = s.cashier_id
    LEFT JOIN transaction_items ti ON s.id = ti.sale_id
    LEFT JOIN products p ON ti.product_id = p.id
    WHERE $where
    GROUP BY s.id
    ORDER BY s.id DESC
");

$transactions = [];
$total_sum    = 0;

if ($q) {
    while ($row = $q->fetch_assoc()) {
        $row['total']     = number_format((float)$row['total'], 2, '.', '');
        $row['sale_date'] = date("M d, Y h:i A", strtotime($row['sale_date']));
        $total_sum       += (float)$row['total'];
        $transactions[]   = $row;
    }
}

echo json_encode([
    "transactions" => $transactions,
    "total_sum"    => number_format($total_sum, 2, '.', ''),
    "count"        => count($transactions)
]);
?>