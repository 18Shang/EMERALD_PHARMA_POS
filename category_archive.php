<?php
include "config.php"; // remove the space
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? null;

if(!$id) {
    echo json_encode(["success" => false, "message" => "No ID provided"]);
    exit;
}

// Set archived = 1
$query = "UPDATE categories SET archived = 1 WHERE category_id = ?";
$stmt = mysqli_prepare($conn, $query);
mysqli_stmt_bind_param($stmt, "i", $id);
$success = mysqli_stmt_execute($stmt);

if($success){
    echo json_encode(["success" => true]);
}else{
    echo json_encode(["success" => false, "message" => mysqli_error($conn)]);
}

mysqli_stmt_close($stmt);
mysqli_close($conn);
?>
