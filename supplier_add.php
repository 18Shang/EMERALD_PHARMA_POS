<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config.php';
error_reporting(0); ini_set('display_errors', 0);

$name    = trim($_POST['supplier_name']  ?? '');
$contact = trim($_POST['contact_person'] ?? '');
$phone   = trim($_POST['phone']          ?? '');
$email   = trim($_POST['email']          ?? '');
$address = trim($_POST['address']        ?? '');
$pids    = json_decode($_POST['product_ids'] ?? '[]', true);

if (!$name) { echo json_encode(['success'=>false,'message'=>'Supplier name required.']); exit; }

$stmt = $conn->prepare("INSERT INTO suppliers (supplier_name, contact_person, phone, email, address) VALUES (?,?,?,?,?)");
$stmt->bind_param("sssss", $name, $contact, $phone, $email, $address);

if (!$stmt->execute()) {
    echo json_encode(['success'=>false,'message'=>$stmt->error]); exit;
}
$supplier_id = $conn->insert_id;

// Link products to this supplier & set them available
if (!empty($pids)) {
    $placeholders = implode(',', array_fill(0, count($pids), '?'));
    $types = str_repeat('i', count($pids) + 1);
    $params = array_merge([$supplier_id], array_map('intval', $pids));
    $upd = $conn->prepare("UPDATE products SET supplier_id=?, status='active' WHERE id IN ($placeholders)");
    $upd->bind_param($types, ...$params);
    $upd->execute();
}

echo json_encode(['success'=>true, 'id'=>$supplier_id]);
$conn->close();