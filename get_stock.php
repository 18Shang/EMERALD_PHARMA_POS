<?php
error_reporting(0);
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

include "config.php";

$q = $conn->query("
    SELECT
        p.id,
        p.name,
        p.brand_name        AS brand,
        p.quantity,
        p.expiry_date,
        p.price,
        p.status,
        p.image,
        IFNULL(c.category_name, p.category) AS category
    FROM products p
    LEFT JOIN categories c ON c.category_id = p.category_id
    WHERE p.is_archived = 0
    ORDER BY p.quantity ASC, p.name ASC
");

$products = [];
if ($q) {
    while ($row = $q->fetch_assoc()) {
        $products[] = [
            'id'          => (int)$row['id'],
            'name'        => $row['name']        ?? '',
            'brand'       => $row['brand']       ?? '',
            'category'    => $row['category']    ?? '',
            'quantity'    => (int)$row['quantity'],
            'price'       => (float)$row['price'],
            'expiry_date' => $row['expiry_date'] ?? '',
            'status'      => $row['status']      ?? '',
            'image'       => $row['image']       ?? '',
        ];
    }
}

echo json_encode($products);
$conn->close();
?>