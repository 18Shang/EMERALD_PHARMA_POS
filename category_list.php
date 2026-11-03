<?php
header("Access-Control-Allow-Origin: *");
include 'config.php';

// Explicitly select parent_id so JS can group items under their parent category
$result = $conn->query("
    SELECT
        category_id,
        category_name,
        description,
        status,
        COALESCE(parent_id, 0) AS parent_id,
        COALESCE(archived, 0)  AS archived
    FROM categories
    ORDER BY COALESCE(parent_id, 0) ASC, category_id ASC
");

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}
echo json_encode($data);
$conn->close();
?>