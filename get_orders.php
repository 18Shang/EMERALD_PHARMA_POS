<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';
error_reporting(0);
ini_set('display_errors', 0);

$customerName = trim($_GET['customer'] ?? '');

// Build WHERE clause — filter by customer if provided and not Walk-in
if (!empty($customerName) && $customerName !== 'Walk-in') {
    $safe   = $conn->real_escape_string($customerName);
    $where  = "WHERE s.customer_name = '$safe'";
} else {
    $where  = "WHERE 1=1";
}

$sql = "
    SELECT
        s.id,
        s.receipt_no,
        s.customer_name,
        s.total,
        s.payment_method,
        s.gcash_reference,
        s.prescription_path,
        s.status,
        DATE_FORMAT(s.sale_date, '%b %d, %Y %h:%i %p') AS sale_date,
        GROUP_CONCAT(
            CONCAT(ti.quantity, 'x ', p.name)
            ORDER BY p.name
            SEPARATOR ', '
        ) AS items
    FROM sales s
    LEFT JOIN transaction_items ti ON s.id = ti.sale_id
    LEFT JOIN products p ON ti.product_id = p.id
    $where
    GROUP BY s.id
    ORDER BY s.sale_date DESC
    LIMIT 100
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode(['error' => $conn->error]);
    exit;
}

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = [
        'id'                => (int)$row['id'],
        'receipt_no'        => $row['receipt_no']        ?? '',
        'customer_name'     => $row['customer_name']     ?? 'Walk-in',
        'total'             => (float)$row['total'],
        'payment_method'    => $row['payment_method']    ?? 'Cash',
        'gcash_reference'   => $row['gcash_reference']   ?? '',
        'prescription_path' => $row['prescription_path'] ?? '',
        'status'            => $row['status']            ?? 'Pending',
        'sale_date'         => $row['sale_date']         ?? '',
        'items'             => $row['items']             ?? '',
    ];
}

echo json_encode($orders);
$conn->close();
?>