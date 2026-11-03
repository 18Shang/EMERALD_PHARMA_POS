<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';
error_reporting(0);
ini_set('display_errors', 0);

$threshold = isset($_GET['threshold']) ? intval($_GET['threshold']) : 20;

// Try full query first
$sql = "
    SELECT
        p.id,
        p.name,
        COALESCE(p.brand_name, '')    AS brand_name,
        p.quantity,
        COALESCE(p.batch_no, '')      AS batch_no,
        COALESCE(p.price, 0)          AS price_per_pack,
        COALESCE(p.expiry_date, '')   AS expiry_date,
        COALESCE(c.category_name, '') AS category_name,
        COALESCE(u.unit_name, '')     AS unit
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN units      u ON p.unit_id     = u.unit_id
    WHERE p.is_archived = 0
      AND p.quantity   <= $threshold
    ORDER BY p.quantity ASC
";

$result = $conn->query($sql);

// Fallback: simpler query without joins if above fails
if (!$result) {
    $sql2   = "SELECT id, name, quantity, batch_no, price AS price_per_pack, expiry_date,
                      '' AS brand_name, '' AS category_name, '' AS unit
               FROM products
               WHERE is_archived = 0 AND quantity <= $threshold
               ORDER BY quantity ASC";
    $result = $conn->query($sql2);
}

$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $rows[] = [
            'id'             => (int)($row['id'] ?? 0),
            'name'           => $row['name']          ?? '',
            'brand_name'     => $row['brand_name']    ?? '',
            'quantity'       => (int)($row['quantity'] ?? 0),
            'batch_no'       => $row['batch_no']      ?? '',
            'price_per_pack' => (float)($row['price_per_pack'] ?? 0),
            'expiry_date'    => $row['expiry_date']   ?? '',
            'category_name'  => $row['category_name'] ?? '',
            'unit'           => $row['unit']          ?? '',
        ];
    }
}

echo json_encode($rows);
$conn->close();
?>