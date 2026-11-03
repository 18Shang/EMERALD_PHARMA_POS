<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config.php';
error_reporting(0); ini_set('display_errors', 0);

$id = intval($_POST['id'] ?? 0);
if (!$id) { echo json_encode(['success'=>false,'message'=>'Invalid ID.']); exit; }

// Unlink products — mark unavailable if no other supplier
$conn->query("UPDATE products SET supplier_id = NULL, status = 'inactive' WHERE supplier_id = $id AND is_archived = 0");

$stmt = $conn->prepare("DELETE FROM suppliers WHERE supplier_id = ?");
$stmt->bind_param("i", $id);

echo json_encode(['success' => $stmt->execute(), 'message' => $stmt->error ?: '']);
$conn->close();