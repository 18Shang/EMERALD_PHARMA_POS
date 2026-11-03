<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Use your specific config with port 3307
include 'config.php';

$response = [
    "status" => "online",
    "database" => "disconnected",
    "details" => ""
];

if (isset($conn) && !$conn->connect_error) {
    $response["database"] = "connected";
} else {
    $response["status"] = "error";
    $response["details"] = "Check XAMPP MySQL on port 3307";
}

echo json_encode($response);
?>