<?php
header("Content-Type: application/json");
include 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

$unit_name = $data['unit_name'] ?? '';
$abbreviation = $data['abbreviation'] ?? '';

if (empty($unit_name) || empty($abbreviation)) {
    echo json_encode(['success' => false, 'msg' => 'All fields are required']);
    exit;
}

$stmt = $conn->prepare("INSERT INTO units (unit_name, abbreviation) VALUES (?, ?)");
$stmt->bind_param("ss", $unit_name, $abbreviation);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'msg' => 'Failed to add unit']);
}
?>
