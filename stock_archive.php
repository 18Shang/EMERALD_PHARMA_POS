<?php
header("Content-Type: application/json");
require_once "config.php"; // your DB connection

if (!isset($_POST['id'])) {
    echo json_encode(['success' => false, 'message' => 'Product ID missing']);
    exit;
}

$id = intval($_POST['id']);

$sql = "UPDATE products SET is_archived = 1 WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Product archived successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to archive product']);
}

$stmt->close();
$conn->close();
?>