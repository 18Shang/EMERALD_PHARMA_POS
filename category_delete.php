<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
include 'config.php';

$id = $_POST['id'] ?? '';
if($id===''){
    echo json_encode(['success'=>false,'message'=>'Invalid ID']);
    exit;
}

$stmt = $conn->prepare("DELETE FROM categories WHERE category_id=?");
$stmt->bind_param("i",$id);
if($stmt->execute()){
    echo json_encode(['success'=>true,'message'=>'Category deleted successfully']);
}else{
    echo json_encode(['success'=>false,'message'=>'Failed to delete category']);
}
$stmt->close();
$conn->close();
?>
