<?php
include "config.php";

$medicine_id    = $_POST['medicine_id'];
$quantity       = $_POST['quantity'];
$purchase_price = $_POST['purchase_price'];
$expiry_date    = $_POST['expiry_date'];
$supplier_id    = $_POST['supplier_id'];
$received_date  = date("Y-m-d");

if ($quantity <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid quantity"]);
    exit();
}

// Insert into stock_in
$insert = "INSERT INTO stock_in 
           (medicine_id, quantity, purchase_price, expiry_date, supplier_id, received_date)
           VALUES 
           ('$medicine_id', '$quantity', '$purchase_price', '$expiry_date', '$supplier_id', '$received_date')";

if (mysqli_query($conn, $insert)) {

    // Increase product quantity
    $update = "UPDATE products 
               SET quantity = quantity + $quantity 
               WHERE id = $medicine_id";

    mysqli_query($conn, $update);

    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error"]);
}

mysqli_close($conn);
?>
