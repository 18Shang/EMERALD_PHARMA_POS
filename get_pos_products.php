<?php
// api/get_pos_products.php
// Returns active, non-archived, non-expired products for the Flutter customer app

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once "config.php";
error_reporting(0);
ini_set('display_errors', 0);

$sql = "
    SELECT
        p.id,
        p.name,
        p.brand_name,
        p.description,
        p.batch_no,
        p.quantity,
        p.expiry_date,
        p.unit_value,
        p.price_per_pack,
        p.price                                          AS price_per_pack_raw,
        CASE
            WHEN p.qty_per_pack > 1 AND p.price_per_pack > 0
            THEN ROUND(p.price_per_pack / p.qty_per_pack, 2)
            ELSE p.price
        END                                              AS price_per_item,
        p.qty_per_pack,
        p.category,
        p.category_id,
        p.requires_prescription,
        u.unit_name          AS unit,
        m.unit_name          AS measurement,
        c.category_name,
        CASE
            WHEN p.image IS NOT NULL AND p.image != ''
            THEN p.image
            ELSE NULL
        END AS image
    FROM products p
    LEFT JOIN categories      c ON p.category_id        = c.category_id
    LEFT JOIN units           u ON p.unit_id             = u.unit_id
    LEFT JOIN measurement_units m ON p.measurement_unit_id = m.unit_id
    LEFT JOIN suppliers       s ON p.supplier_id         = s.supplier_id
    WHERE p.is_archived = 0
      AND (p.status = 'active' OR p.status = 'Available')
      AND p.quantity    > 0
      AND (p.expiry_date IS NULL OR p.expiry_date = '0000-00-00' OR p.expiry_date >= CURDATE())
    ORDER BY p.name ASC
";

$result   = $conn->query($sql);
$products = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $products[] = [
            'id'                     => (int)$row['id'],
            'name'                   => $row['name']        ?? '',
            'brand_name'             => $row['brand_name']  ?? '',
            'description'            => $row['description'] ?? '',
            'batch_no'               => $row['batch_no']    ?? '',
            'quantity'               => (int)$row['quantity'],
            'expiry_date'            => $row['expiry_date'] ?? '',
            'unit_value'             => $row['unit_value']  ?? '',
            'price'                  => (float)($row['price_per_item'] ?? $row['price'] ?? 0),
            'price_per_pack'         => (float)($row['price_per_pack'] ?? $row['price'] ?? 0),
            'qty_per_pack'           => (int)($row['qty_per_pack'] ?? 1),
            'category'               => $row['category_name'] ?? $row['category'] ?? '',
            'unit'                   => $row['unit']        ?? '',
            'measurement'            => $row['measurement'] ?? '',
            'requires_prescription'  => (int)($row['requires_prescription'] ?? 0),
            'image'                  => $row['image'] ?? '',
        ];
    }
}

echo json_encode($products);
$conn->close();
?>