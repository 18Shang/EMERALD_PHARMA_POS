<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config.php';
error_reporting(0); ini_set('display_errors', 0);

$product_id  = intval($_POST['product_id']  ?? 0);
$supplier_id = intval($_POST['supplier_id'] ?? 0) ?: null;

if (!$product_id) { echo json_encode(['success'=>false,'message'=>'Invalid product.']); exit; }

$status = $supplier_id ? 'active' : 'inactive';

if ($supplier_id) {
    $stmt = $conn->prepare("UPDATE products SET supplier_id=?, status=? WHERE id=?");
    $stmt->bind_param("isi", $supplier_id, $status, $product_id);
} else {
    $stmt = $conn->prepare("UPDATE products SET supplier_id=NULL, status=? WHERE id=?");
    $stmt->bind_param("si", $status, $product_id);
}

echo json_encode(['success' => $stmt->execute(), 'message' => $stmt->error ?: '']);
$conn->close();