<?php
header("Content-Type: text/plain");
require_once "config.php";

$project_root = str_replace('\\', '/', dirname(__DIR__));
echo "project_root: $project_root\n\n";

$q = $conn->query("SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != '' LIMIT 3");
while ($r = $q->fetch_assoc()) {
    $img_rel  = ltrim(str_replace('\\', '/', $r['image']), '/');
    $img_path = $project_root . '/' . $img_rel;
    echo "Name: {$r['name']}\n";
    echo "  DB image  : {$r['image']}\n";
    echo "  Full path : $img_path\n";
    echo "  Exists    : " . (file_exists($img_path) ? 'YES ✅' : 'NO ❌') . "\n\n";
}
?>