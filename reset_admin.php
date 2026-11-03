<?php
include 'config.php';

// Admin account username
$adminUsername = "admin";

// New password you want to set
$newPassword = "admin123"; // <-- the password you will remember

// Hash it properly
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

// Update the admin password in DB
$stmt = $conn->prepare("UPDATE users SET password=? WHERE username=? AND role='admin'");
$stmt->bind_param("ss", $hashedPassword, $adminUsername);

if($stmt->execute()){
    echo "Admin password updated! You can now login with: $newPassword";
}else{
    echo "Failed to update admin password.";
}
?>
