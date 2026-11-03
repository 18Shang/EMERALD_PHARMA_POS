<?php
// ============================================================
//  save_order.php
//
//  Flutter sends:
//    total          = correct cart total (e.g. 80.00 for 1x pack)
//    payment_method = "Cash" or "GCash"
//    customer_name  = logged-in customer name
//    cart           = [{"id":12,"qty":1}, ...]  (NO price in cart!)
//
//  KEY: Flutter strips "-piece"/"-pack" from id and sends NO unit price.
//  So we MUST derive unit_price = total / total_qty across all items.
//  For single-item carts: unit_price = total / qty  (exact)
//  For multi-item carts: we split total proportionally by product price ratio.
// ============================================================
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

// ── Read fields ───────────────────────────────────────────
$flutter_total  = floatval($_POST['total']          ?? 0);
$payment_method = trim($_POST['payment_method']     ?? 'Cash');
$raw_name       = trim($_POST['customer_name']      ?? '');
$cart_json      = $_POST['cart']                    ?? '[]';
$cart           = json_decode($cart_json, true)     ?? [];

// ── Customer name ─────────────────────────────────────────
$customer_name = (!empty($raw_name) && strtolower($raw_name) !== 'walk-in' && $raw_name !== 'null')
                 ? $conn->real_escape_string($raw_name)
                 : 'Walk-in';

// ── Payment method ────────────────────────────────────────
$payment_method = in_array($payment_method, ['Cash','GCash']) ? $payment_method : 'Cash';
$pay_esc        = $conn->real_escape_string($payment_method);

// ── Validate ─────────────────────────────────────────────
if (empty($cart) || $flutter_total <= 0) {
    echo json_encode(["success" => false, "message" => "Invalid order data."]);
    exit;
}

$receipt_no = "REC-" . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 8));

$conn->begin_transaction();
try {

    // ── Step 1: Fetch all products & calculate price ratios ──
    // Flutter sends total=80 for 1x pack, total=8 for 1x tablet.
    // We don't know which they picked, but total IS correct.
    // For each item: unit_price = flutter_total * (product_weight / total_weight)
    // For single item cart: unit_price = flutter_total / qty  (simple & exact)

    $cart_items = [];
    $weight_sum = 0;

    foreach ($cart as $item) {
        $pid = intval($item['id']  ?? 0);
        $qty = intval($item['qty'] ?? 1);
        if ($pid <= 0 || $qty <= 0) continue;

        $pq = $conn->query("
            SELECT id, name, price, price_per_pack, qty_per_pack
            FROM products WHERE id = $pid LIMIT 1
        ");
        if (!$pq || $pq->num_rows === 0) continue;
        $p = $pq->fetch_assoc();

        // Weight = price_per_pack (fallback: price) — used only for multi-item ratio
        $weight = floatval($p['price_per_pack']) > 0
                  ? floatval($p['price_per_pack'])
                  : floatval($p['price']);

        $cart_items[] = [
            'id'     => $pid,
            'qty'    => $qty,
            'name'   => $p['name'],
            'weight' => $weight,
        ];
        $weight_sum += $weight * $qty;
    }

    if (empty($cart_items)) throw new Exception("No valid products found.");

    // ── Step 2: Calculate unit prices from flutter_total ────
    // This is the KEY fix: trust flutter_total, not products table
    foreach ($cart_items as &$ci) {
        if (count($cart_items) === 1) {
            // Single item: unit_price = total / qty  (exact, handles per-piece & per-pack)
            $ci['unit_price'] = $flutter_total / $ci['qty'];
        } else {
            // Multi-item: split proportionally by weight ratio
            $ratio            = ($ci['weight'] * $ci['qty']) / ($weight_sum ?: 1);
            $item_total       = $flutter_total * $ratio;
            $ci['unit_price'] = $item_total / $ci['qty'];
        }
        $ci['subtotal'] = round($ci['unit_price'] * $ci['qty'], 2);
    }
    unset($ci);

    // ── Step 3: Insert sale as Pending ───────────────────────
    $conn->query("
        INSERT INTO sales
            (customer_name, total, receipt_no, status, sale_date, payment_type, payment_method)
        VALUES
            ('$customer_name', '$flutter_total', '$receipt_no', 'Pending', NOW(), '$pay_esc', '$pay_esc')
    ");
    $sale_id = $conn->insert_id;
    if (!$sale_id) throw new Exception("Failed to create sale: " . $conn->error);

    // ── Step 4: Insert transaction_items with correct prices ─
    $items_response = [];
    foreach ($cart_items as $ci) {
        $pid        = $ci['id'];
        $qty        = $ci['qty'];
        $unit_price = round($ci['unit_price'], 2);
        $subtotal   = round($ci['subtotal'], 2);

        $conn->query("
            INSERT INTO transaction_items (sale_id, product_id, quantity, price, unit_price, subtotal)
            VALUES ('$sale_id', '$pid', '$qty', '$unit_price', '$unit_price', '$subtotal')
        ");

        $items_response[] = [
            "name"     => $ci['name'],
            "qty"      => $qty,
            "subtotal" => number_format($subtotal, 2, '.', '')
        ];
    }

    $conn->commit();

    // Flutter reads: receipt_no, date, items[{qty,name,subtotal}]
    echo json_encode([
        "success"    => true,
        "receipt_no" => $receipt_no,
        "date"       => date("M d, Y h:i A"),
        "items"      => $items_response,
        "message"    => "Order placed successfully."
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>