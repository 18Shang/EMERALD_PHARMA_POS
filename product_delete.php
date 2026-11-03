<?php
include 'config.php';
header('Content-Type: application/json');

// Get JSON input
$data = json_decode(file_get_contents('php://input'), true);

// Validate input
if (!$data || !isset($data['id']) || empty($data['id'])) {
    echo json_encode([
        "success" => false,
        "msg" => "ID is required"
    ]);
    exit;
}

$id = (int)$data['id']; // cast to integer for safety

// Prepare and execute delete
$stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
if (!$stmt) {
    echo json_encode([
        "success" => false,
        "msg" => "Prepare failed: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("i", $id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode([
            "success" => true,
            "msg" => "Product deleted successfully"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "msg" => "No product found with this ID"
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "msg" => "Execute failed: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>
