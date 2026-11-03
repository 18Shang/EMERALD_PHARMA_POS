<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

require_once "config.php";

if (!$conn) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);
    exit();
}

if (!isset($_POST['id']) || !isset($_POST['quantity'])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing parameters"
    ]);
    exit();
}

$id = intval($_POST['id']);
$quantity = intval($_POST['quantity']);

if ($id <= 0 || $quantity < 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid data"
    ]);
    exit();
}

// ✅ Prepared statement (SAFE)
$stmt = $conn->prepare("UPDATE products SET quantity = ? WHERE id = ?");
$stmt->bind_param("ii", $quantity, $id);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Stock updated successfully"
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Update failed"
    ]);
}

$stmt->close();
mysqli_close($conn);
?>