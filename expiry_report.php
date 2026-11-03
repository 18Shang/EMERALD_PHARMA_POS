<?php
header("Content-Type: application/json");
require_once "config.php"; 

$selectedDate = isset($_GET['date']) ? $_GET['date'] : null;
$currentDate = date('Y-m-d');

try {
    // Update products that have already expired
    $updateStmt = $conn->prepare("UPDATE products SET status = 'expired' WHERE expiry_date < ? AND status = 'active'");
    $updateStmt->bind_param("s", $currentDate);
    $updateStmt->execute();

    if ($selectedDate) {
        $stmt = $conn->prepare("
            SELECT p.*, p.batch_no, u.unit_name AS unit, m.unit_name AS measurement
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.unit_id
            LEFT JOIN measurement_units m ON p.measurement_unit_id = m.unit_id
            WHERE p.expiry_date <= ? 
              AND (p.status='active' OR p.status='expired') 
              AND p.is_archived=0
        ");
        $stmt->bind_param("s", $selectedDate);
    } else {
        $stmt = $conn->prepare("
            SELECT p.*, p.batch_no, u.unit_name AS unit, m.unit_name AS measurement
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.unit_id
            LEFT JOIN measurement_units m ON p.measurement_unit_id = m.unit_id
            WHERE (p.status='active' OR p.status='expired') 
              AND p.is_archived=0
        ");
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    echo json_encode($products);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}
?>