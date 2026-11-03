<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

ob_start(); 
require_once "config.php";

$action = $_POST['action'] ?? $_GET['action'] ?? 'fetch';

// Automatically build the server base URL for images
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$baseUrl = $protocol . "://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/";

// --- FETCH PRODUCTS ---
if ($action == 'fetch') {
    $sql = "SELECT p.*, u.unit_name AS unit 
            FROM products p 
            LEFT JOIN units u ON p.unit_id = u.unit_id 
            WHERE p.is_archived = 0 ORDER BY p.id DESC";
            
    $result = $conn->query($sql);
    $products = [];

    if ($result) {
        $today = date('Y-m-d'); // Current server date

        while ($row = $result->fetch_assoc()) {
            $qty = (int)($row['quantity'] ?? 0);
            $expiry = $row['expiry_date'] ?? '';

            // --- STATUS LOGIC ---
            // We check Expiry first, because even if there is stock, 
            // if it's past the date, it should be marked Expired.
            
            if (!empty($expiry) && $expiry !== '0000-00-00' && $expiry < $today) {
                $row['status'] = "Expired";
            } elseif ($qty <= 0) {
                $row['status'] = "Out of Stock";
            } elseif ($qty < 10) {
                $row['status'] = "Low Stock";
            } else {
                $row['status'] = "Available";
            }

            // Convert relative image path to full URL
            if (!empty($row['image'])) {
                if (strpos($row['image'], 'http') !== 0) {
                    $row['image'] = $baseUrl . $row['image'];
                }
            }

            $products[] = $row;
        }
    }
    ob_end_clean();
    echo json_encode($products);
    exit();
}

// --- ADD NEW PRODUCT ---
elseif ($action == 'add') {
    $name    = $_POST['name'] ?? '';
    $batch   = $_POST['batch_no'] ?? '';
    $qty     = $_POST['quantity'] ?? 0;
    $price   = $_POST['price'] ?? 0.0;
    $rate    = $_POST['rate'] ?? 0.0;
    $u_id    = $_POST['unit_id'] ?? null;
    $m_id    = $_POST['measurement_unit_id'] ?? null;
    $u_val   = $_POST['unit_value'] ?? 0;
    $c_id    = $_POST['category_id'] ?? null;
    $expiry  = $_POST['expiry_date'] ?? '';
    
    $image_path = ""; 

    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $target_dir = "uploads/";
        if (!file_exists($target_dir)) {
            mkdir($target_dir, 0777, true);
        }
        
        $ext = pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION);
        $filename = "img_" . time() . "_" . rand(1000, 9999) . "." . $ext;
        $target_file = $target_dir . $filename;

        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
            $image_path = $target_file; // Relative path for DB
        }
    }

    $sql = "INSERT INTO products (name, batch_no, quantity, price, rate, unit_id, measurement_unit_id, unit_value, category_id, expiry_date, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssiddiiisss", $name, $batch, $qty, $price, $rate, $u_id, $m_id, $u_val, $c_id, $expiry, $image_path);
    
    if ($stmt->execute()) {
        ob_end_clean();
        echo json_encode(["success" => true, "message" => "Product added successfully"]);
    } else {
        ob_end_clean();
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }
    exit();
}

$conn->close();
?>