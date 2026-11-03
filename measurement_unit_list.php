<?php
header("Content-Type: application/json");
require_once "config.php";

$result = $conn->query("SELECT unit_id, unit_name, abbreviation FROM measurement_units ORDER BY unit_name ASC");

$list = [];
if($result){
    while($row = $result->fetch_assoc()){
        $list[] = $row;
    }
}

echo json_encode($list);
$conn->close();
?>