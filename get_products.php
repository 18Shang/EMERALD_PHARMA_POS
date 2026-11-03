<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
require_once "config.php";

$sql = "SELECT 
            p.id, 
            p.name, 
            p.batch_no, 
            p.quantity, 
            p.expiry_date, 
            p.unit_value, 
            u.unit_name AS unit, 
            m.unit_name AS measurement_name
        FROM products p
        LEFT JOIN units u ON p.unit_id = u.unit_id
        LEFT JOIN measurement_units m ON p.measurement_unit_id = m.unit_id
        WHERE p.is_archived = 0
        ORDER BY p.id DESC";

$result = $conn->query($sql);
$products = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Calculate status locally
        $expiry = strtotime($row['expiry_date']);
        $today = strtotime(date("Y-m-d"));
        $row['status'] = ($expiry < $today) ? "Expired" : "Available";
        
        $products[] = $row;
    }
}

echo json_encode($products);
$conn->close();
?>