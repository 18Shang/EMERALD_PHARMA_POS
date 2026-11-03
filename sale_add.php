<?php
header("Access-Control-Allow-Origin: *");  
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include 'config.php';

$cashier_id = $_POST['cashier_id'] ?? 0;
$total = $_POST['total'] ?? 0;
$items = json_decode($_POST['items'] ?? '[]', true);

if(!$cashier_id || !$total || empty($items)){
    echo json_encode(["status"=>"error","message"=>"Invalid sale data"]);
    exit();
}

$conn->query("INSERT INTO sales(cashier_id,total) VALUES($cashier_id,$total)");
$sale_id = $conn->insert_id;

foreach($items as $item){
    $conn->query("INSERT INTO sale_items(sale_id,product_name,quantity,price)
                  VALUES($sale_id,'{$item['name']}',{$item['qty']},{$item['price']})");
}

echo json_encode(["status"=>"success","message"=>"Sale saved"]);
?>
