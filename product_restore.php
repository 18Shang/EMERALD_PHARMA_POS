<?php
require_once "config.php";

$data = json_decode(file_get_contents("php://input"), true);
$id = $data['id'] ?? 0;

if ($id > 0) {
    $stmt = $conn->prepare("UPDATE products SET is_archived = 0 WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Product restored successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Failed to restore product"]);
    }
}
?>
