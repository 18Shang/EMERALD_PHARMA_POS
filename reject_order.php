<?php
include "config.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['order_id'])) {
    echo json_encode(["success" => false, "message" => "Order ID missing"]);
    exit;
}

$order_id = intval($data['order_id']);

$conn->query("
    UPDATE orders 
    SET status = 'Rejected'
    WHERE id = $order_id AND status = 'Pending'
");

if ($conn->affected_rows > 0) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Unable to reject order"]);
}
?>