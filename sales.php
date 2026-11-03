<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

include 'config.php';

$type = $_GET['type'] ?? 'daily';

if($type=="daily"){
    $query = "SELECT sale_date, SUM(total) as total_sales FROM sales GROUP BY sale_date ORDER BY sale_date DESC";
}else{
    $query = "SELECT DATE_FORMAT(sale_date, '%Y-%m') as month, SUM(total) as total_sales FROM sales GROUP BY month ORDER BY month DESC";
}

$result = $conn->query($query);
$data = array();
while($row = $result->fetch_assoc()){
    $data[] = $row;
}
echo json_encode($data);
?>
