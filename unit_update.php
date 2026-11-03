<?php
header("Content-Type: application/json");
include 'config.php';
$d=json_decode(file_get_contents("php://input"),true);
$id=intval($d['unit_id']??0);
$name=$d['unit_name']??'';
$abbr=$d['abbreviation']??'';
if($id==0 || $name=='' || $abbr==''){ echo json_encode(['success'=>false]); exit; }
$stmt=$conn->prepare("UPDATE units SET unit_name=?,abbreviation=? WHERE unit_id=?");
$stmt->bind_param("ssi",$name,$abbr,$id);
echo json_encode($stmt->execute()?['success'=>true]:['success'=>false]);
?>
