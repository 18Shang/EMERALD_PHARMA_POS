<?php
include "config.php"; // your database connection

header('Content-Type: application/json');

try {
    $sql = "SELECT id, unit, unit_value FROM products ORDER BY id ASC";
    $result = $conn->query($sql);

$data[] = [
    "id" => $row['id'],
    "unit" => $row['unit'],
    "unit_value" => $row['unit_value'] === null ? "" : $row['unit_value'],
];


    echo json_encode($data);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Error fetching unit values: " . $e->getMessage()
    ]);
}
?>
