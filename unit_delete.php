<?php
header("Content-Type: application/json");
include "db.php"; // your DB connection

if (!isset($_POST['unit_id'])) {
    echo json_encode([
        "success" => false,
        "message" => "unit_id missing"
    ]);
    exit;
}

$unit_id = intval($_POST['unit_id']);

$sql = "DELETE FROM units WHERE unit_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $unit_id);

if ($stmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Deleted"
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => $stmt->error
    ]);
}
