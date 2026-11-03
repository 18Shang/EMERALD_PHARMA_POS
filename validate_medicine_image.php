<?php
// api/validate_medicine_image.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once 'config.php';
error_reporting(0);
ini_set('display_errors', 0);

// ── CONFIG: Add this line to your config.php ──────────────────────
// define('ANTHROPIC_API_KEY', 'sk-ant-your-key-here');
// ─────────────────────────────────────────────────────────────────
$apiKey = defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '';

if (empty($_FILES['image']['tmp_name'])) {
    echo json_encode(['success' => false, 'message' => 'No image uploaded.']);
    exit;
}

$tmpPath  = $_FILES['image']['tmp_name'];
$mimeType = mime_content_type($tmpPath);
$filename = strtolower($_FILES['image']['name'] ?? '');

// Only allow image types
$allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($mimeType, $allowed)) {
    echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, GIF, WEBP allowed.']);
    exit;
}

// ── If API key is set: use Claude Vision (most accurate) ─────────
if (!empty($apiKey)) {
    $imageData = base64_encode(file_get_contents($tmpPath));

    $payload = json_encode([
        'model'      => 'claude-haiku-4-5-20251001',
        'max_tokens' => 50,
        'messages'   => [[
            'role'    => 'user',
            'content' => [
                [
                    'type'   => 'image',
                    'source' => [
                        'type'       => 'base64',
                        'media_type' => $mimeType,
                        'data'       => $imageData
                    ]
                ],
                [
                    'type' => 'text',
                    'text' => 'Is this image a medicine, pharmaceutical product, drug packaging, pill, tablet, capsule, syrup, bottle of medicine, or pharmacy-related item? Reply with only YES or NO.'
                ]
            ]
        ]]
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01'
        ],
        CURLOPT_TIMEOUT => 15,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data   = json_decode($response, true);
        $answer = strtoupper(trim($data['content'][0]['text'] ?? ''));
        if (strpos($answer, 'YES') !== false) {
            echo json_encode(['success' => true, 'message' => 'Valid medicine image.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Image does not appear to be a medicine or pharmaceutical product. Please upload a medicine image only.']);
        }
        exit;
    }
    // API call failed — fall through to strict keyword check
}

// ── Fallback: strict filename keyword check — BLOCKS by default ──
$medKeywords = [
    'tablet','capsule','pill','syrup','medicine','drug','pharma','medication',
    'amoxicillin','aspirin','paracetamol','ibuprofen','vitamin','metformin',
    'cetirizine','losartan','amlodipine','omeprazole','atorvastatin','mg','ml',
    'rx','otc','dose','pack','batch','generic','brand','cap','tab','inj',
    'solution','suspension','cream','ointment','gel','drops','inhaler','patch',
    'antibiotic','antiviral','analgesic','supplement','multivitamin','probiotic',
    'lozenge','suppository','vial','ampule','sachet','elixir','tincture'
];

$isMedicine = false;
foreach ($medKeywords as $kw) {
    if (strpos($filename, $kw) !== false) {
        $isMedicine = true;
        break;
    }
}

if ($isMedicine) {
    echo json_encode(['success' => true, 'message' => 'Valid medicine image.']);
} else {
    // HARD BLOCK — no API key and filename doesn't look like medicine
    echo json_encode([
        'success' => false,
        'message' => 'Cannot verify image as a medicine or pharmaceutical product. Please upload a medicine product image, or rename your file to include the medicine name (e.g. paracetamol.jpg).'
    ]);
}
?>