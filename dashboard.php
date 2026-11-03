<?php
// ============================================================
//  dashboard.php — Admin Dashboard API
//  Reads from: sales (Completed), products, transaction_items
// ============================================================
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

$response = [
    "total_sales"    => 0,
    "low_stock"      => 0,
    "expiry"         => 0,
    "total_products" => 0,
    "transactions"   => [],
    "low_stock_list" => [],
    "expiry_list"    => []
];

// ── 1. Total Sales — sum ALL Completed sales ────────────────
// Includes both cashier POS sales AND customer app orders
$q = $conn->query("
    SELECT IFNULL(SUM(total), 0) AS total_sales
    FROM sales
    WHERE status = 'Completed'
");
if ($q) {
    $row = $q->fetch_assoc();
    $response['total_sales'] = number_format((float)$row['total_sales'], 2, '.', '');
}

// ── 2. Low Stock count ──────────────────────────────────────
$q2 = $conn->query("
    SELECT COUNT(*) AS cnt FROM products
    WHERE quantity <= 10 AND is_archived = 0 AND status = 'active'
");
if ($q2) $response['low_stock'] = (int)$q2->fetch_assoc()['cnt'];

// ── 3. Expiry count (within 30 days) ────────────────────────
$q3 = $conn->query("
    SELECT COUNT(*) AS cnt FROM products
    WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      AND expiry_date >= CURDATE()
      AND is_archived = 0 AND status = 'active'
");
if ($q3) $response['expiry'] = (int)$q3->fetch_assoc()['cnt'];

// ── 4. Total active products ─────────────────────────────────
$q4 = $conn->query("
    SELECT COUNT(*) AS cnt FROM products
    WHERE is_archived = 0 AND status = 'active'
");
if ($q4) $response['total_products'] = (int)$q4->fetch_assoc()['cnt'];

// ── 5. Recent Transactions (last 20 Completed) ──────────────
// payment_type OR payment_method — handle both column names
$pay_col = "'Cash'";
$chk = $conn->query("SHOW COLUMNS FROM sales LIKE 'payment_type'");
if ($chk && $chk->num_rows > 0) $pay_col = "IFNULL(s.payment_type, 'Cash')";

$q5 = $conn->query("
    SELECT
        s.id,
        s.receipt_no,
        IFNULL(s.customer_name, 'Walk-in') AS customer_name,
        s.total,
        s.sale_date,
        $pay_col AS payment_type,
        GROUP_CONCAT(
            CONCAT(ti.quantity, 'x ', IFNULL(p.name, 'Product'))
            ORDER BY p.name SEPARATOR ', '
        ) AS medicines
    FROM sales s
    LEFT JOIN transaction_items ti ON s.id = ti.sale_id
    LEFT JOIN products p           ON ti.product_id = p.id
    WHERE s.status = 'Completed'
    GROUP BY s.id
    ORDER BY s.id DESC
    LIMIT 20
");
if ($q5) {
    while ($row = $q5->fetch_assoc()) {
        $row['total']     = number_format((float)$row['total'], 2, '.', '');
        $row['sale_date'] = date("M d, Y h:i A", strtotime($row['sale_date']));
        $row['medicines'] = $row['medicines'] ?? '—';
        $response['transactions'][] = $row;
    }
}

// ── 6. Low Stock list (for alert box) ───────────────────────
$q6 = $conn->query("
    SELECT name, quantity AS info FROM products
    WHERE quantity <= 10 AND is_archived = 0 AND status = 'active'
    ORDER BY quantity ASC LIMIT 10
");
if ($q6) {
    while ($row = $q6->fetch_assoc()) {
        $response['low_stock_list'][] = [
            "name" => $row['name'],
            "info" => $row['info'] . " left"
        ];
    }
}

// ── 7. Expiry list (for alert box) ──────────────────────────
$q7 = $conn->query("
    SELECT name, expiry_date AS info FROM products
    WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      AND expiry_date >= CURDATE()
      AND is_archived = 0 AND status = 'active'
    ORDER BY expiry_date ASC LIMIT 10
");
if ($q7) {
    while ($row = $q7->fetch_assoc()) {
        $response['expiry_list'][] = [
            "name" => $row['name'],
            "info" => $row['info']
        ];
    }
}

echo json_encode($response);
?>