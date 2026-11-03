<?php
include "config.php"; // your DB connection
header('Content-Type: application/json');

// Get data from POST body
$data = json_decode(file_get_contents("php://input"), true);

if(!isset($data['id'])) {
    echo json_encode([
        "success" => false,
        "message" => "No ID provided"
    ]);
    exit;
}

$id = $data['id'];

// Update category to active (archived = 0)
$query = "UPDATE categories SET archived = 0 WHERE category_id = ?";
$stmt = mysqli_prepare($conn, $query);
mysqli_stmt_bind_param($stmt, "i", $id);

$success = mysqli_stmt_execute($stmt);

if($success) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode([
        "success" => false,
        "message" => mysqli_error($conn)
    ]);
}

mysqli_stmt_close($stmt);
mysqli_close($conn);
?>
