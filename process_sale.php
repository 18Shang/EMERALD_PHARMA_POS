<?php
include "config.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data"]);
    exit;
}

$total = $data['total'];
$cash = $data['cash_received'];
$change = $data['change_amount'];
$cart = $data['cart'];
$receipt_no = "RX-" . strtoupper(uniqid());

$conn->begin_transaction();

try {
    // 1. Insert Main Sale
    $stmt = $conn->prepare("INSERT INTO sales (receipt_no, total, status, sale_date) VALUES (?, ?, 'Completed', NOW())");
    $stmt->bind_param("sd", $receipt_no, $total);
    $stmt->execute();
    $sale_id = $conn->insert_id;

    // 2. Insert Items & Update Stock
    foreach ($cart as $item) {
        $p_id = $item['id'];
        $qty = $item['qty'];
        $price = $item['price'];

        $stmt_item = $conn->prepare("INSERT INTO transaction_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
        $stmt_item->bind_param("iiid", $sale_id, $p_id, $qty, $price);
        $stmt_item->execute();

        // Deduct Inventory
        $conn->query("UPDATE products SET quantity = quantity - $qty WHERE id = $p_id");
    }

    $conn->commit();
    echo json_encode(["status" => "success", "receipt_no" => $receipt_no]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>