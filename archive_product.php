<?php
require_once "config.php";
$data = json_decode(file_get_contents("php://input"), true);
$ids = $data['ids'] ?? [];
if(count($ids) > 0){
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $types = str_repeat('i', count($ids));
    $stmt = $conn->prepare("UPDATE products SET is_archived=1 WHERE id IN ($placeholders)");
    $stmt->bind_param($types, ...$ids);
    $stmt->execute();
    echo json_encode(['success'=>true, 'message'=>'Selected products archived.']);
}else{
    echo json_encode(['success'=>false, 'message'=>'No products selected.']);
}
?>