<?php
// ============================================================
//  Emerald Pharmacy — Save POS Transaction
//  Location: api/save_transaction.php
// ============================================================
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

if (session_status() === PHP_SESSION_NONE) session_start();

$input = json_decode(file_get_contents('php://input'), true);

$total           = floatval($input['total']           ?? 0);
$amount_received = floatval($input['amount_received'] ?? 0);
$change          = floatval($input['change']          ?? 0);
$cart            = $input['cart'] ?? [];
$payment_method  = $input['payment_method'] ?? 'Cash';

if (empty($cart)) {
    echo json_encode(['success' => false, 'message' => 'Cart is empty.']);
    exit;
}

// ── Get cashier ID from session ───────────────────────────────
$cashier_id = intval($_SESSION['user_id'] ?? 0);

// Fallback: look up by username if user_id not in session
if ($cashier_id === 0 && !empty($_SESSION['username'])) {
    $uname = $conn->real_escape_string($_SESSION['username']);
    $uq    = $conn->query("SELECT id FROM users WHERE username='$uname' LIMIT 1");
    if ($uq && $row = $uq->fetch_assoc()) {
        $cashier_id = intval($row['id']);
    }
}

// ── Generate receipt number ───────────────────────────────────
$receipt_no = 'REC-W-' . time() . rand(10, 99);

// ── Insert sale ───────────────────────────────────────────────
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("
        INSERT INTO sales
            (receipt_no, customer_name, cashier_id, total, status, payment_type, payment_method)
        VALUES (?, 'Walk-in', ?, ?, 'Completed', ?, ?)
    ");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);

    $stmt->bind_param('sidss',
        $receipt_no,
        $cashier_id,
        $total,
        $payment_method,
        $payment_method
    );
    $stmt->execute();
    $sale_id = $conn->insert_id;
    $stmt->close();

    // ── Insert transaction items + deduct stock ───────────────
    foreach ($cart as $item) {
        $product_id = intval($item['id']    ?? 0);
        $qty        = intval($item['qty']   ?? 1);
        $price      = floatval($item['price'] ?? 0);
        $is_pack    = strpos(($item['cartId'] ?? ''), '-pack') !== false ? 1 : 0;
        $subtotal   = $price * $qty;

        $si = $conn->prepare("
            INSERT INTO transaction_items (sale_id, product_id, quantity, price, subtotal)
            VALUES (?, ?, ?, ?, ?)
        ");
        if ($si) {
            $si->bind_param('iiidd', $sale_id, $product_id, $qty, $price, $subtotal);
            $si->execute();
            $si->close();
        }

        // Deduct stock
        if ($is_pack) {
            // Pack: deduct qty_per_pack * qty pieces
            $conn->query("
                UPDATE products
                SET quantity = quantity - (qty_per_pack * $qty)
                WHERE id = $product_id AND quantity >= (qty_per_pack * $qty)
            ");
        } else {
            $conn->query("
                UPDATE products
                SET quantity = quantity - $qty
                WHERE id = $product_id AND quantity >= $qty
            ");
        }
    }

    $conn->commit();
    echo json_encode([
        'success'    => true,
        'receipt_no' => $receipt_no,
        'sale_id'    => $sale_id,
        'cashier_id' => $cashier_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

$conn->close();
?>