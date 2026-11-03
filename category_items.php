<?php
// ── category_items.php ──
// Returns all active items (sub-categories) belonging to a given parent_id.
// GET param: ?parent_id=<id>

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
include 'config.php';

$parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;

if ($parent_id <= 0) {
    echo json_encode([]);
    $conn->close();
    exit;
}

$stmt = $conn->prepare("
    SELECT
        category_id,
        category_name,
        description,
        status,
        parent_id,
        COALESCE(archived, 0) AS archived
    FROM categories
    WHERE parent_id = ?
      AND (archived IS NULL OR archived = 0)
    ORDER BY category_name ASC
");
$stmt->bind_param("i", $parent_id);
$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
$stmt->close();
$conn->close();
?>