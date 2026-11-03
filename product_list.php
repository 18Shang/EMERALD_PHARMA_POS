<?php
// Set headers for Flutter Web compatibility (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

require_once "config.php";

// Silence PHP errors to ensure only valid JSON is sent to Flutter
error_reporting(0);
ini_set('display_errors', 0);

// FETCH ALL PRODUCTS INCLUDING EXPIRED
$sql = "
    SELECT 
        p.id, p.name, p.brand_name, p.description, p.batch_no,
        p.quantity, p.qty_per_pack, p.expiry_date, p.unit_value,
        p.price, p.price_per_pack, p.rate,
        p.category_id, c.category_name,
        p.supplier_id, s.supplier_name,
        p.unit_id, u.unit_name AS unit,
        p.measurement_unit_id, m.unit_name AS measurement_name,
        p.status, p.is_archived, p.image
    FROM products p
    LEFT JOIN categories      c ON p.category_id      = c.category_id
    LEFT JOIN units           u ON p.unit_id           = u.unit_id
    LEFT JOIN measurement_units m ON p.measurement_unit_id = m.unit_id
    LEFT JOIN suppliers       s ON p.supplier_id       = s.supplier_id
    WHERE p.is_archived = 0
    ORDER BY p.id DESC
";

$result = $conn->query($sql);
$products = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Format numeric types
        $row['id']            = (int)$row['id'];
        $row['quantity']      = (int)$row['quantity'];
        $row['qty_per_pack']  = (int)($row['qty_per_pack'] ?? 1);
        $row['price']         = (float)$row['price'];
        $row['price_per_pack']= (float)($row['price_per_pack'] ?? 0);
        $row['rate']          = (float)$row['rate'];
        $row['supplier_id']   = $row['supplier_id'] ? (int)$row['supplier_id'] : null;
        $row['supplier_name'] = $row['supplier_name'] ?? null;
        
        // Handle nulls and empty expiry
        $row['expiry_date'] = (empty($row['expiry_date']) || $row['expiry_date'] === "0000-00-00") ? "" : $row['expiry_date'];
        $row['category_id'] = $row['category_id'] ? (int)$row['category_id'] : null;
        $row['unit_id'] = $row['unit_id'] ? (int)$row['unit_id'] : null;
        $row['measurement_unit_id'] = $row['measurement_unit_id'] ? (int)$row['measurement_unit_id'] : null;

        // Calculate status based on expiry_date
        if (!empty($row['expiry_date'])) {
            $row['status'] = (strtotime($row['expiry_date']) < strtotime(date("Y-m-d"))) ? "Expired" : "Available";
        } else {
            $row['status'] = "Available";
        }

        $products[] = $row;
    }
}

echo json_encode($products);
$conn->close();
exit();
?>