<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config.php';
error_reporting(0); ini_set('display_errors', 0);

$sql = "
    SELECT s.supplier_id, s.supplier_name, s.contact_person, s.phone, s.email, s.address,
           COUNT(DISTINCT p.id) AS product_count,
           GROUP_CONCAT(DISTINCT p.id ORDER BY p.id) AS product_ids_str
    FROM suppliers s
    LEFT JOIN products p ON p.supplier_id = s.supplier_id AND p.is_archived = 0
    GROUP BY s.supplier_id
    ORDER BY s.supplier_name ASC
";
$result    = $conn->query($sql);
$suppliers = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['product_count'] = (int)$row['product_count'];
        $row['product_ids']   = $row['product_ids_str']
            ? array_map('intval', explode(',', $row['product_ids_str']))
            : [];
        unset($row['product_ids_str']);
        $suppliers[] = $row;
    }
}

$r1 = $conn->query("SELECT COUNT(*) AS c FROM products WHERE is_archived=0 AND supplier_id IS NOT NULL");
$r2 = $conn->query("SELECT COUNT(*) AS c FROM products WHERE is_archived=0 AND supplier_id IS NULL");

echo json_encode([
    'suppliers'      => $suppliers,
    'supplied_count' => (int)($r1 ? $r1->fetch_assoc()['c'] : 0),
    'unsupplied'     => (int)($r2 ? $r2->fetch_assoc()['c'] : 0),
]);
$conn->close();