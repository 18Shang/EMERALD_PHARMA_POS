<?php
// api/restock_product.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';
error_reporting(0);
ini_set('display_errors', 0);

$id          = intval($_POST['id']        ?? 0);
$add_qty     = intval($_POST['add_qty']    ?? 0);
$expiry_date = trim($_POST['expiry_date']  ?? '');

if ($id <= 0 || $add_qty <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid product or quantity.']);
    exit;
}

// Add stock and update expiry date if provided
if ($expiry_date !== '') {
    $stmt = $conn->prepare("UPDATE products SET quantity = quantity + ?, expiry_date = ? WHERE id = ? AND is_archived = 0");
    $stmt->bind_param("isi", $add_qty, $expiry_date, $id);
} else {
    $stmt = $conn->prepare("UPDATE products SET quantity = quantity + ? WHERE id = ? AND is_archived = 0");
    $stmt->bind_param("ii", $add_qty, $id);
}

if ($stmt->execute() && $stmt->affected_rows > 0) {
    // Get new quantity
    $r       = $conn->query("SELECT quantity FROM products WHERE id = $id");
    $new_qty = $r ? (int)$r->fetch_assoc()['quantity'] : 0;
    echo json_encode([
        'success' => true,
        'new_qty' => $new_qty,
        'message' => "Restocked successfully. New qty: $new_qty"
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Product not found or update failed.']);
}

$conn->close();
?>