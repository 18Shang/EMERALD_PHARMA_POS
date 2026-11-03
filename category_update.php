<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
include 'config.php';

$id = $_POST['id'] ?? '';
$name = $_POST['name'] ?? '';
$description = $_POST['description'] ?? '';
$status = $_POST['status'] ?? '';

if($id==='' || $name===''){
    echo json_encode(['success'=>false,'message'=>'Invalid data']);
    exit;
}

$stmt = $conn->prepare("UPDATE categories SET category_name=?, description=?, status=? WHERE category_id=?");
$stmt->bind_param("sssi",$name,$description,$status,$id);
if($stmt->execute()){
    echo json_encode(['success'=>true,'message'=>'Category updated successfully']);
}else{
    echo json_encode(['success'=>false,'message'=>'Failed to update category']);
}
$stmt->close();
$conn->close();
?>
