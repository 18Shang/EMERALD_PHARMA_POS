<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "config.php";
error_reporting(E_ALL);
ini_set('display_errors', 0);

$id                  = intval($_POST['id']                  ?? 0);
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
if ($price_per_item <= 0 && $price_per_pack > 0) {
    $price_per_item = round($price_per_pack / $qty_per_pack, 2);
}
$price = $price_per_item;
$expiry_date         = trim($_POST['expiry_date']           ?? '') ?: null;
$description         = trim($_POST['description']           ?? '');
$batch_no            = trim($_POST['batch_no']              ?? '');

if ($id <= 0 || empty($name) || $category_id <= 0 || $unit_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

// Get category name separately
$catResult     = $conn->query("SELECT category_name FROM categories WHERE category_id = " . (int)$category_id);
$category_name = $catResult ? ($catResult->fetch_assoc()['category_name'] ?? '') : '';

// Handle image upload (optional on update)
$imageSql   = '';
$imageVal   = null;
$imageType  = '';
if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    $ext      = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
    $filename = 'img_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
    if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename)) {
        $imageSql  = ', image = ?';
        $imageVal  = 'uploads/' . $filename;
        $imageType = 's';
    }
}

// Params (no image):
//  name(s) brand_name(s) category_id(i) unit_id(i) measurement_unit_id(i)
//  unit_value(s) quantity(i) price(d) expiry_date(s) description(s)
//  batch_no(s) category(s) id(i)
// = 12 base params + optional image(s) + id(i)

$sql = "
    UPDATE products SET
        name                = ?,
        brand_name          = ?,
        category_id         = ?,
        supplier_id         = ?,
        unit_id             = ?,
        measurement_unit_id = ?,
        unit_value          = ?,
        quantity            = ?,
        price               = ?,
        price_per_pack      = ?,
        qty_per_pack        = ?,
        expiry_date         = ?,
        description         = ?,
        batch_no            = ?,
        category            = ?
        $imageSql
    WHERE id = ?
";

// Base types (no image): s s i i i i s i d d i s s s s [+s] i
// ssiiiisiddissss[s]i
$types  = 'ssiiiisiddissssi';   // 16 chars for 15 SET params + id
$params = [
    $name,
    $brand_name,
    $category_id,
    $supplier_id,
    $unit_id,
    $measurement_unit_id,
    $unit_value,
    $quantity,
    $price_per_item,
    $price_per_pack,
    $qty_per_pack,
    $expiry_date,
    $description,
    $batch_no,
    $category_name,
];

if ($imageVal !== null) {
    // Insert image type BEFORE the final 'i' (id)
    $types   = 'ssiiiisiddissss' . 's' . 'i';  // 17 chars with image
    $params[] = $imageVal;
} else {
    $types = 'ssiiiisiddissssi';  // 16 chars without image
}
$params[] = $id;

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Prepare error: ' . $conn->error]);
    exit;
}

$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Product updated successfully.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Update error: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
?>