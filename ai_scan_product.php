<?php
// api/ai_scan_product.php — OFFLINE VERSION
// Uses server-side Tesseract OCR (no internet needed)
// Requirements: Tesseract OCR must be installed on the server
// XAMPP Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki
// Then add to PATH or set $tesseract_path below

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

error_reporting(0);
ini_set('display_errors', 0);

// ── Path to Tesseract binary ──────────────────────────────────
// Windows XAMPP: change to 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
// Linux/Mac: usually just 'tesseract' (already in PATH)
$tesseract_path = 'tesseract'; // or full path e.g. 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'No image provided.']);
    exit;
}

// Save uploaded image to temp
$tmp_in  = $_FILES['image']['tmp_name'];
$tmp_out = sys_get_temp_dir() . '/scan_' . uniqid();

// Run Tesseract OCR
$cmd    = escapeshellarg($tesseract_path) . ' ' . escapeshellarg($tmp_in) . ' ' . escapeshellarg($tmp_out) . ' 2>&1';
$output = shell_exec($cmd);
$txt_file = $tmp_out . '.txt';

if (!file_exists($txt_file)) {
    // Try alternate path for Windows XAMPP
    $tesseract_path = 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe';
    $cmd    = escapeshellarg($tesseract_path) . ' ' . escapeshellarg($tmp_in) . ' ' . escapeshellarg($tmp_out) . ' 2>&1';
    $output = shell_exec($cmd);
}

if (!file_exists($txt_file)) {
    echo json_encode([
        'success' => false,
        'message' => 'Tesseract OCR not found. Install from: https://github.com/UB-Mannheim/tesseract/wiki — then restart XAMPP.'
    ]);
    exit;
}

$raw_text = file_get_contents($txt_file);
@unlink($txt_file);

// ── Smart medicine name parser ────────────────────────────────
$lines  = array_filter(array_map('trim', explode("\n", $raw_text)), fn($l) => strlen($l) > 1);
$result = ['name' => '', 'dosage' => '', 'form' => '', 'notes' => ''];

// Known medicine names (score highest)
$known_drugs = [
    'aciclovir','acyclovir','amoxicillin','ampicillin','azithromycin',
    'aspirin','paracetamol','ibuprofen','mefenamic','cetirizine',
    'loratadine','metformin','amlodipine','omeprazole','losartan',
    'atorvastatin','simvastatin','ciprofloxacin','doxycycline',
    'salbutamol','prednisolone','dexamethasone','hydrocortisone',
    'ranitidine','famotidine','lansoprazole','pantoprazole',
    'metronidazole','clindamycin','erythromycin','cotrimoxazole',
    'biogesic','neozep','solmux','bioflu','alaxan','decolgen',
    'tuseran','lagundi','sambong','medicol','flanax','ponstan',
    'dolfenal','cataflam','voltaren','naproxen','celecoxib',
    'loperamide','domperidone','ondansetron','metoclopramide',
    'fluconazole','ketoconazole','clotrimazole','miconazole',
    'vitamin','ascorbic','ferrous','calcium','zinc','saphrivax',
    'saphrivax-400','tramadol','diclofenac','buscopan','hyoscine',
];

// Words to skip
$skip = ['lot','batch','exp','expiry','mfg','store','keep','below','room',
    'temperature','warning','caution','prescription','only','insert',
    'leaflet','direction','read','label','distributed','imported',
    'registered','for oral','oral use','keep out','reach','children',
    'film','coated','tablet','tablets','capsule','capsules','syrup',
    'solution','powder','injection','cream','ointment','gel'];

$dosage_regex = '/(\d+\.?\d*)\s*(mg|mcg|g\b|ml|iu|%|mg\/ml)/i';
$form_words   = ['tablet','tablets','capsule','capsules','syrup','suspension',
    'drops','injection','cream','ointment','gel','solution','powder',
    'sachet','patch','inhaler','film-coated'];

$name_candidates = [];

foreach ($lines as $line) {
    $lower = strtolower($line);

    // Skip noise
    if (preg_match('/^\d[\d\s\/\-\.]+$/', $line)) continue;
    if (strlen($line) < 3 || strlen($line) > 80) continue;
    if (in_array($lower, $skip)) continue;
    if (preg_match('/^\d{4}[-\/]\d{2}/', $line)) continue; // dates

    // Extract dosage
    if (preg_match($dosage_regex, $line, $m) && empty($result['dosage'])) {
        $result['dosage'] = $m[0];
    }

    // Extract form
    foreach ($form_words as $fw) {
        if (stripos($line, $fw) !== false && empty($result['form'])) {
            $result['form'] = ucfirst($fw);
            break;
        }
    }

    // Score the line as a name candidate
    $score = 0;

    // Check known drugs
    foreach ($known_drugs as $drug) {
        if (stripos($line, $drug) !== false) {
            $score += 100;
            break;
        }
    }

    // Prefer lines that are mostly letters (not numbers)
    $letters = preg_replace('/[^a-zA-Z]/', '', $line);
    if (strlen($letters) >= 3) $score += 10;

    // Prefer shorter lines (medicine names are usually short)
    if (strlen($line) <= 30) $score += 5;
    if (strlen($line) <= 20) $score += 5;

    // Penalize lines with too many numbers
    $digits = preg_replace('/[^0-9]/', '', $line);
    if (strlen($digits) > 4) $score -= 20;

    // Penalize skip words
    foreach ($skip as $sw) {
        if (stripos($lower, $sw) !== false) { $score -= 30; break; }
    }

    if ($score > 0) {
        $name_candidates[] = ['line' => $line, 'score' => $score];
    }
}

// Sort by score descending
usort($name_candidates, fn($a, $b) => $b['score'] - $a['score']);

if (!empty($name_candidates)) {
    $best = $name_candidates[0]['line'];
    // Clean up — remove pure numbers and special chars at start/end
    $best = trim(preg_replace('/^[\d\s\.\-]+/', '', $best));
    $result['name'] = $best;
}

// Build display name with dosage
if (!empty($result['name']) && !empty($result['dosage'])) {
    // If dosage not already in name, append it
    if (stripos($result['name'], $result['dosage']) === false) {
        $result['name'] = $result['name'] . ' ' . $result['dosage'];
    }
}

if (!empty($result['name'])) {
    echo json_encode([
        'success'  => true,
        'medicine' => [
            'name'   => trim($result['name']),
            'dosage' => trim($result['dosage']),
            'form'   => trim($result['form']),
            'notes'  => 'Scanned offline via Tesseract OCR',
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Could not identify medicine name. Please fill in manually. Raw text: ' . substr(implode(' ', $lines), 0, 100)
    ]);
}
?>