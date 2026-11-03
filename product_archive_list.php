<?php
require_once "config.php";

// Fetch only archived products with unit names
$sql = "
    SELECT 
        p.*, 
        u.unit_name AS unit
    FROM products p
    LEFT JOIN units u ON p.unit_id = u.unit_id
    WHERE p.is_archived = 1
    ORDER BY p.id DESC
";
$result = $conn->query($sql);

$products = [];

while ($row = $result->fetch_assoc()) {
    // Handle empty expiry dates
    if ($row['expiry_date'] === null || $row['expiry_date'] === "") {
        $row['expiry_date'] = "No expiry";
    }
    // Optional: Handle null unit
    if (!isset($row['unit']) || $row['unit'] === null) {
        $row['unit'] = "No unit";
    }
    $products[] = $row;
}

echo json_encode($products);
?>