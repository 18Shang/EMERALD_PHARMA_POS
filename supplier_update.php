<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config.php';
error_reporting(0); ini_set('display_errors', 0);

$id      = intval($_POST['id']             ?? 0);
$name    = trim($_POST['supplier_name']    ?? '');
$contact = trim($_POST['contact_person']   ?? '');
$phone   = trim($_POST['phone']            ?? '');
$email   = trim($_POST['email']            ?? '');
$address = trim($_POST['address']          ?? '');
$pids    = json_decode($_POST['product_ids'] ?? '[]', true);
$pids    = array_map('intval', $pids);

if (!$id || !$name) { echo json_encode(['success'=>false,'message'=>'Missing data.']); exit; }

$stmt = $conn->prepare("UPDATE suppliers SET supplier_name=?, contact_person=?, phone=?, email=?, address=? WHERE supplier_id=?");
$stmt->bind_param("sssssi", $name, $contact, $phone, $email, $address, $id);
$stmt->execute();

// Remove this supplier from ALL products first
$conn->query("UPDATE products SET supplier_id = NULL, status = 'inactive' WHERE supplier_id = $id");

// Re-assign selected products & mark them active
if (!empty($pids)) {
    $placeholders = implode(',', array_fill(0, count($pids), '?'));
    $types  = str_repeat('i', count($pids) + 1);
    $params = array_merge([$id], $pids);
    $upd    = $conn->prepare("UPDATE products SET supplier_id=?, status='active' WHERE id IN ($placeholders)");
    $upd->bind_param($types, ...$params);
    $upd->execute();
}

// Any product with a supplier stays active, any without becomes inactive
$conn->query("UPDATE products SET status='active'   WHERE supplier_id IS NOT NULL AND is_archived=0");
$conn->query("UPDATE products SET status='inactive' WHERE supplier_id IS NULL     AND is_archived=0");

echo json_encode(['success'=>true]);
$conn->close();