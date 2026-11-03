<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

require_once "config.php";

$data = json_decode(file_get_contents("php://input"));

if(!isset($data->full_name) || !isset($data->email) || !isset($data->password)){
    echo json_encode([
        "status" => "error",
        "message" => "Full name, email, and password required"
    ]);
    exit;
}

$full_name = $conn->real_escape_string($data->full_name);
$email = $conn->real_escape_string($data->email);
$password = password_hash($data->password, PASSWORD_DEFAULT);

// Check if email already exists
$check = $conn->query("SELECT id FROM customers WHERE email='$email'");
if($check->num_rows > 0){
    echo json_encode([
        "status" => "error",
        "message" => "Email already exists"
    ]);
    exit;
}

// Insert user
$sql = "INSERT INTO customers (full_name, email, password) VALUES ('$full_name', '$email', '$password')";
if($conn->query($sql)){
    echo json_encode([
        "status" => "success",
        "message" => "Registration successful"
    ]);
}else{
    echo json_encode([
        "status" => "error",
        "message" => "Registration failed"
    ]);
}

$conn->close();
?>