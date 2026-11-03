<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once "config.php";

// Get POST data
$id = isset($_POST['id']) ? $_POST['id'] : null;
$quantity = isset($_POST['quantity']) ? $_POST['quantity'] : null;

if ($id && $quantity !== null) {
    // Sanitize input
    $id = $conn->real_escape_string($id);
    $quantity = $conn->real_escape_string($quantity);

    $sql = "UPDATE products SET quantity = '$quantity' WHERE id = '$id'";

    if ($conn->query($sql)) {
        echo json_encode(["status" => "success", "message" => "Stock updated"]);
    } else {
        echo json_encode(["status" => "error", "message" => $conn->error]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Missing ID or Quantity"]);
}

$conn->close();
?>