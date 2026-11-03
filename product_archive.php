<?php
header("Content-Type: application/json");
require_once "config.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['id'])) {
    echo json_encode(["success"=>false,"message"=>"ID missing"]); exit;
}

$id = intval($data['id']);
if ($id <= 0) {
    echo json_encode(["success"=>false,"message"=>"Invalid ID"]); exit;
}

$stmt = $conn->prepare("UPDATE products SET is_archived=1 WHERE id=?");
$stmt->bind_param("i", $id);

if($stmt->execute()){
    echo json_encode(["success"=>true,"message"=>"Product archived successfully"]);
}else{
    echo json_encode(["success"=>false,"message"=>$stmt->error]);
}

$stmt->close();
$conn->close();
?>