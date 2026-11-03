<?php
header("Content-Type: application/json");
require_once "config.php";

$result = $conn->query("SELECT unit_id, unit_name FROM units ORDER BY unit_id DESC");

$units = [];
if($result){
    while($row = $result->fetch_assoc()){
        $units[] = $row;
    }
}
echo json_encode($units);
$conn->close();
?>