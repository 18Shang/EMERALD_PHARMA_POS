<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include 'config.php';

// Get POST data safely
$fullname = trim($_POST['fullname'] ?? '');
$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$role     = $_POST['role'] ?? 'Staff';

// VALID ROLES (ADMIN NOT ALLOWED)
$allowedRoles = ['Staff', 'Cashier'];
if (!in_array($role, $allowedRoles)) {
    $role = 'Staff'; // force default
}

// Validate input
if (empty($fullname) || empty($username) || empty($password)) {
    echo json_encode([
        "status" => "error",
        "message" => "All fields are required"
    ]);
    exit;
}

// Hash password
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Check if username exists
$check = $conn->prepare("SELECT id FROM users WHERE username = ?");
$check->bind_param("s", $username);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Username already exists"
    ]);
    $check->close();
    exit;
}
$check->close();

// Insert user
$stmt = $conn->prepare(
    "INSERT INTO users (fullname, username, password, role)
     VALUES (?, ?, ?, ?)"
);
$stmt->bind_param("ssss", $fullname, $username, $hashedPassword, $role);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Registration failed"
    ]);
}

$stmt->close();
$conn->close();
?>