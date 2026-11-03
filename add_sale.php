<?php
include "config.php";

$cashier_id = $_POST['cashier_id'];
$product_id = $_POST['product_id'];
$quantity   = $_POST['quantity'];
$price      = $_POST['price'];

if ($quantity <= 0) {
    echo json_encode(["status" => "error", "message" => "Invalid quantity"]);
    exit();
}

// Check current stock
$check = mysqli_query($conn, "SELECT quantity FROM products WHERE id = $product_id");
$row = mysqli_fetch_assoc($check);

if ($row['quantity'] < $quantity) {
    echo json_encode(["status" => "error", "message" => "Not enough stock"]);
    exit();
}

$total = $quantity * $price;
$sale_date = date("Y-m-d H:i:s");

// Insert into sales
$sale_sql = "INSERT INTO sales (cashier_id, total, sale_date, status)
             VALUES ('$cashier_id', '$total', '$sale_date', 'Completed')";

if (mysqli_query($conn, $sale_sql)) {

    $sale_id = mysqli_insert_id($conn);

    // Insert transaction item
    $item_sql = "INSERT INTO transaction_items 
                 (sale_id, product_id, quantity, price)
                 VALUES 
                 ('$sale_id', '$product_id', '$quantity', '$price')";

    mysqli_query($conn, $item_sql);

    // Deduct stock
    $update_stock = "UPDATE products 
                     SET quantity = quantity - $quantity 
                     WHERE id = $product_id";

    mysqli_query($conn, $update_stock);

    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error"]);
}

mysqli_close($conn);
?>
