<?php
header("Access-Control-Allow-Origin: *");
require_once "config.php";

$id = $_POST['id'];
$target_dir = "uploads/";

if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

if (isset($_FILES["image"])) {
    $file_extension = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
    $new_filename = "prod_" . $id . "_" . time() . "." . $file_extension;
    $target_file = $target_dir . $new_filename;

    if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
        // Update the database with the new URL
        $url = "http://YOUR_SERVER_IP/api/" . $target_file;
        $conn->query("UPDATE products SET image_url = '$url' WHERE id = '$id'");
        
        echo json_encode(["status" => "success", "url" => $url]);
    } else {
        echo json_encode(["status" => "error", "message" => "Upload failed"]);
    }
}
?>