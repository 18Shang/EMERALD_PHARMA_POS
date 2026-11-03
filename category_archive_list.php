<?php
include "config.php"; // your DB connection

header('Content-Type: application/json');

// Select only archived categories (archived = 1)
$query = "SELECT category_id, category_name, description, status FROM categories WHERE archived = 1";
$result = mysqli_query($conn, $query);

$categories = [];

if($result) {
    while($row = mysqli_fetch_assoc($result)) {
        $categories[] = $row;
    }
}

echo json_encode($categories);
?>
