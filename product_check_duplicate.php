<?php
include 'config.php';

// Only get the product name from POST
$name = $_POST['name'] ?? '';

// Prepare SQL to check duplicate by name only
$sql = "SELECT COUNT(*) as count FROM products WHERE name = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $name);
$stmt->execute();
$result = $stmt->get_result()->fetch_assoc();

// Return true if a product with the same name exists
echo json_encode([
    "exists" => $result['count'] > 0
]);
?>