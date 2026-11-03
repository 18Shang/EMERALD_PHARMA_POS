<?php
// ── supplier_archive.php ──
// Archives a supplier (soft delete) and marks its products as Unavailable.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");
include 'config.php';

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid ID.']);
    exit;
}

// Archive the supplier
$stmt = $conn->prepare("UPDATE suppliers SET archived = 1 WHERE supplier_id = ?");
$stmt->bind_param("i", $id);
if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Failed to archive supplier.']);
    $stmt->close(); $conn->close(); exit;
}
$stmt->close();

// Mark all products linked to this supplier as Unavailable
$stmt2 = $conn->prepare("UPDATE products SET status = 'Unavailable' WHERE supplier_id = ?");
$stmt2->bind_param("i", $id);
$stmt2->execute();
$stmt2->close();

echo json_encode(['success' => true, 'message' => 'Supplier archived.']);
$conn->close();
?>