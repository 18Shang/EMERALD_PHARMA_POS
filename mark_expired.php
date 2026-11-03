<?php
header("Content-Type: application/json");
require_once "config.php"; // Your DB connection

// Get product IDs from POST
$ids = isset($_POST['ids']) ? $_POST['ids'] : [];

if(empty($ids)){
    echo json_encode(["success" => false, "message" => "No products selected."]);
    exit;
}

try {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids)); // all integers

    $stmt = $conn->prepare("UPDATE products SET status='expired', is_archived=1 WHERE id IN ($placeholders)");
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();

    echo json_encode([
        "success" => true,
        "message" => count($ids) . " products marked as expired."
    ]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>