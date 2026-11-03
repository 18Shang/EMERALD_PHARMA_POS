<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// ---------- GET USERS ----------
if ($method === 'GET') {
    $result = $conn->query("SELECT id, fullname, username, role FROM users");
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            "id" => $row['id'],
            "fullname" => $row['fullname'] ?? "",
            "username" => $row['username'] ?? "",
            "role" => $row['role'] ?? "",
        ];
    }
    echo json_encode($users);
    exit();
}

// ---------- ADD USER ----------
if ($method === 'POST') {
    $fullname = $_POST['fullname'] ?? '';
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $role     = $_POST['role'] ?? '';

    if (!$fullname || !$username || !$password || !$role) {
        echo json_encode(["status"=>"error","message"=>"All fields required"]);
        exit();
    }

    // check if username exists
    $stmtCheck = $conn->prepare("SELECT id FROM users WHERE username=?");
    $stmtCheck->bind_param("s", $username);
    $stmtCheck->execute();
    $stmtCheck->store_result();
    if ($stmtCheck->num_rows > 0) {
        echo json_encode(["status"=>"error","message"=>"Username already exists"]);
        exit();
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare(
        "INSERT INTO users (fullname, username, password, role) VALUES (?,?,?,?)"
    );
    $stmt->bind_param("ssss", $fullname, $username, $hashed, $role);

    echo $stmt->execute()
        ? json_encode(["status"=>"success"])
        : json_encode(["status"=>"error","message"=>"Insert failed"]);

    exit();
}

// ---------- UPDATE USER ----------
if ($method === 'PUT') {
    parse_str(file_get_contents("php://input"), $_PUT);

    $id       = $_PUT['id'];
    $fullname = $_PUT['fullname'];
    $username = $_PUT['username'];
    $role     = $_PUT['role'];
    $password = $_PUT['password'] ?? '';

    if ($password) {
        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare(
            "UPDATE users SET fullname=?, username=?, password=?, role=? WHERE id=?"
        );
        $stmt->bind_param("ssssi", $fullname, $username, $hashed, $role, $id);
    } else {
        $stmt = $conn->prepare(
            "UPDATE users SET fullname=?, username=?, role=? WHERE id=?"
        );
        $stmt->bind_param("sssi", $fullname, $username, $role, $id);
    }

    echo $stmt->execute()
        ? json_encode(["status"=>"success"])
        : json_encode(["status"=>"error"]);

    exit();
}

// ---------- DELETE USER ----------
if ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DEL);
    $id = $_DEL['id'];

    $stmt = $conn->prepare("DELETE FROM users WHERE id=?");
    $stmt->bind_param("i", $id);

    echo $stmt->execute()
        ? json_encode(["status"=>"success"])
        : json_encode(["status"=>"error"]);

    exit();
}
?>
