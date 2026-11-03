<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
include 'config.php';

$name        = trim($_POST['name']        ?? '');
$description = trim($_POST['description'] ?? '');
$status      = $_POST['status']           ?? 'Available';
$parent_id   = isset($_POST['parent_id']) && intval($_POST['parent_id']) > 0
                ? intval($_POST['parent_id'])
                : null;

if ($name === '') {
    echo json_encode(['success' => false, 'message' => 'Category name required']);
    exit;
}

// Check for duplicate name under the same parent
if ($parent_id) {
    $checkStmt = $conn->prepare(
        "SELECT COUNT(*) AS count FROM categories WHERE category_name = ? AND parent_id = ?"
    );
    $checkStmt->bind_param("si", $name, $parent_id);
} else {
    $checkStmt = $conn->prepare(
        "SELECT COUNT(*) AS count FROM categories WHERE category_name = ? AND (parent_id IS NULL OR parent_id = 0)"
    );
    $checkStmt->bind_param("s", $name);
}
$checkStmt->execute();
$checkResult = $checkStmt->get_result()->fetch_assoc();
$checkStmt->close();

if ($checkResult['count'] > 0) {
    echo json_encode(['success' => false, 'message' => 'Name already exists']);
    $conn->close();
    exit;
}

// Insert — include parent_id if it's an item, NULL if it's a top-level category
if ($parent_id) {
    // Item inside a category: save with parent_id and status
    $stmt = $conn->prepare(
        "INSERT INTO categories (category_name, description, status, parent_id) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("sssi", $name, $description, $status, $parent_id);
} else {
    // Top-level category: no status (it's a container), no parent
    $stmt = $conn->prepare(
        "INSERT INTO categories (category_name, description, status, parent_id) VALUES (?, ?, 'Available', NULL)"
    );
    $stmt->bind_param("ss", $name, $description);
}

if ($stmt->execute()) {
    echo json_encode([
        'success'     => true,
        'message'     => 'Saved successfully',
        'category_id' => $conn->insert_id
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to save']);
}

$stmt->close();
$conn->close();
?>