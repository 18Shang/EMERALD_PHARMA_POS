<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "config.php";
error_reporting(0);
ini_set('display_errors', 0);

$name                = trim($_POST['name']                  ?? '');
$brand_name          = trim($_POST['brand_name']            ?? '');
$category_id         = intval($_POST['category_id']         ?? 0);
$supplier_id         = !empty($_POST['supplier_id'])         ? intval($_POST['supplier_id']) : null;
$unit_id             = intval($_POST['unit_id']             ?? 0);
$measurement_unit_id = intval($_POST['measurement_unit_id'] ?? 0) ?: null;
$unit_value          = trim($_POST['unit_value']            ?? '');
$quantity            = intval($_POST['quantity']            ?? 0);
$price_per_pack      = floatval($_POST['price']             ?? 0);
$price_per_item      = floatval($_POST['price_per_item']    ?? 0);
$qty_per_pack        = intval($_POST['qty_per_pack']        ?? 1) ?: 1;

// If price_per_item not provided, calculate from pack price
if ($price_per_item <= 0 && $price_per_pack > 0) {
    $price_per_item = round($price_per_pack / $qty_per_pack, 2);
}
$price       = $price_per_item;
$expiry_date = trim($_POST['expiry_date'] ?? '');
$description = trim($_POST['description'] ?? '');
$batch_no    = trim($_POST['batch_no']    ?? '');

if (empty($name) || $category_id <= 0 || $unit_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

// Get category name text
$catResult     = $conn->query("SELECT category_name FROM categories WHERE category_id = " . $category_id);
$category_name = $catResult ? ($catResult->fetch_assoc()['category_name'] ?? '') : '';

// Auto-generate batch no if empty
if (empty($batch_no)) {
    $batch_no = 'BATCH-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5));
}

// Handle image upload
$imagePath = null;
if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $ext      = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $filename = 'img_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
    if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename)) {
        $imagePath = 'uploads/' . $filename;
    }
}

// 16 columns → 16 ? placeholders
// Types (no spaces allowed):
//   s = name
//   s = brand_name
//   i = category_id
//   i = supplier_id
//   i = unit_id
//   i = measurement_unit_id
//   s = unit_value
//   i = quantity
//   d = price (per item)
//   d = price_per_pack
//   i = qty_per_pack
//   s = expiry_date
//   s = description
//   s = batch_no
//   s = image (path)
//   s = category (name text)
$stmt = $conn->prepare(
    "INSERT INTO products
        (name, brand_name, category_id, supplier_id, unit_id, measurement_unit_id,
         unit_value, quantity, price, price_per_pack, qty_per_pack,
         expiry_date, description, batch_no, image, category, status, is_archived)
     VALUES (?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, 'active', 0)"
);

if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare error: ' . $conn->error]);
    exit;
}

$stmt->bind_param(
    "ssiiiisiddisssss",
    $name,
    $brand_name,
    $category_id,
    $supplier_id,
    $unit_id,
    $measurement_unit_id,
    $unit_value,
    $quantity,
    $price,
    $price_per_pack,
    $qty_per_pack,
    $expiry_date,
    $description,
    $batch_no,
    $imagePath,
    $category_name
);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Product added.', 'id' => $conn->insert_id]);
} else {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $stmt->error]);
}
$conn->close();
?>