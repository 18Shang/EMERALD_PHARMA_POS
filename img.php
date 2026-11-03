<?php
// ── img.php ── Image proxy with CORS headers for Flutter Web
// Usage: /emerald_system/api/img.php?f=img_xxx.jpg
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Cache-Control: public, max-age=86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$file = basename($_GET['f'] ?? '');
if (empty($file)) { http_response_code(400); exit; }

$path = __DIR__ . '/uploads/' . $file;

if (!file_exists($path)) {
    http_response_code(404);
    exit;
}

$ext  = strtolower(pathinfo($file, PATHINFO_EXTENSION));
$mime = match($ext) {
    'jpg', 'jpeg' => 'image/jpeg',
    'png'         => 'image/png',
    'gif'         => 'image/gif',
    'webp'        => 'image/webp',
    default       => 'application/octet-stream',
};

header("Content-Type: $mime");
header("Content-Length: " . filesize($path));
readfile($path);
?>