<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

// Database config
$host = "127.0.0.1";  // Use 127.0.0.1 instead of localhost for Web
$port = 3307;          // <-- NEW MySQL port
$user = "root";
$password = "";
$dbname = "emerald_system";

// Connect
$conn = new mysqli($host, $user, $password, $dbname, $port);

// Check connection
if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "msg" => "Database connection failed: " . $conn->connect_error
    ]);
    exit;
}
// ── Anthropic API Key (for medicine image validation) ──────────
define('ANTHROPIC_API_KEY', 'YOUR_ANTHROPIC_API_KEY_HERE');
?>