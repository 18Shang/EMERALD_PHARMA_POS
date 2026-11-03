<?php
// ── supplier_archive_list.php ── Returns archived suppliers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include 'config.php';

$result = $conn->query("
    SELECT supplier_id, supplier_name, contact_person, phone, email, address
    FROM suppliers
    WHERE archived = 1
    ORDER BY supplier_name ASC
");
$data = [];
while ($row = $result->fetch_assoc()) $data[] = $row;
echo json_encode($data);
$conn->close();
?>