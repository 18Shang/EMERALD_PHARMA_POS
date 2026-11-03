<?php
// ── supplier_restore.php ── Restores an archived supplier
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");
include 'config.php';

$id = intval($_POST['id'] ?? 0);
if ($id <= 0) { echo json_encode(['success'=>false,'message'=>'Invalid ID.']); exit; }

$stmt = $conn->prepare("UPDATE suppliers SET archived = 0 WHERE supplier_id = ?");
$stmt->bind_param("i", $id);
if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Supplier restored.']);
} else {
    echo json_encode(['success' => false, 'message' => $stmt->error]);
}
$stmt->close();
$conn->close();
?>