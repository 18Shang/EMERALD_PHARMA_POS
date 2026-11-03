<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
require_once 'config.php';
error_reporting(0); ini_set('display_errors', 0);

$sql = "
    SELECT p.id, p.name, p.brand_name,
           s.supplier_name,
           CASE WHEN p.supplier_id IS NOT NULL THEN 'Available' ELSE 'Unavailable' END AS availability
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
    WHERE p.is_archived = 0
    ORDER BY availability ASC, p.name ASC
";
$result = $conn->query($sql);
$rows   = [];
if ($result) while ($row = $result->fetch_assoc()) $rows[] = $row;
echo json_encode($rows);
$conn->close();