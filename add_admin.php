<?php
include 'config.php';

// Set your admin username and password here
$adminUsername = "admin";
$adminPassword = "admin123"; // <-- change this to your desired password
$adminRole = "admin";

// Hash the password
$hashedPassword = password_hash($adminPassword, PASSWORD_DEFAULT);

// Check if admin already exists
$stmt = $conn->prepare("SELECT id FROM users WHERE username=?");
$stmt->bind_param("s", $adminUsername);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows > 0){
    echo "Admin user already exists!";
    exit();
}

// Insert admin user
$stmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $adminUsername, $hashedPassword, $adminRole);

if($stmt->execute()){
    echo "Admin user created successfully! Username: $adminUsername, Password: $adminPassword";
}else{
    echo "Failed to create admin user.";
}
?>
