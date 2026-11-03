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
$order_id = intval($data['order_id'] ?? 0);

if ($order_id <= 0) {
    echo json_encode(["success" => false, "message" => "Invalid order ID."]);
    exit;
}

// Get sale
$sq = $conn->query("SELECT * FROM sales WHERE id = $order_id LIMIT 1");
if (!$sq || $sq->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Order not found."]);
    exit;
}
$sale = $sq->fetch_assoc();

// Get items — use unit_price stored by save_order.php (reflects what customer paid)
$iq = $conn->query("
    SELECT
        ti.quantity,
        ti.unit_price,
        ti.subtotal,
        p.name
    FROM transaction_items ti
    JOIN products p ON ti.product_id = p.id
    WHERE ti.sale_id = $order_id
    ORDER BY p.name
");

$medicines_parts = [];
$items_detail    = [];

if ($iq) {
    while ($item = $iq->fetch_assoc()) {
        $qty        = intval($item['quantity']);
        $name       = $item['name'];
        $unit_price = floatval($item['unit_price']);
        $subtotal   = $unit_price * $qty;

        // "qty|name|unit_price" — parsed by cashier JS parseMedicines()
        $medicines_parts[] = "$qty|$name|" . number_format($unit_price, 2, '.', '');

        $items_detail[] = [
            "qty"      => $qty,
            "name"     => $name,
            "price"    => number_format($unit_price, 2, '.', ''),
            "subtotal" => number_format($subtotal,   2, '.', '')
        ];
    }
}

echo json_encode([
    "success"       => true,
    "medicines"     => implode(';', $medicines_parts),
    "items_detail"  => $items_detail,
    "proof_image"   => null,
    "sale_date"     => date("M d, Y h:i A", strtotime($sale['sale_date'])),
    "receipt_no"    => $sale['receipt_no']    ?? '',
    "payment_type"  => $sale['payment_method'] ?? 'Cash',
    "customer_name" => $sale['customer_name'] ?? 'Walk-in',
    "total"         => number_format((float)$sale['total'], 2, '.', '')
]);
?>