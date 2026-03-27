<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Handle GET request to fetch current balance and points from session
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check for reset parameter
    if (isset($_GET['action']) && $_GET['action'] === 'reset') {
        $_SESSION['color_balance'] = 100000;
        $_SESSION['color_points'] = 1000;
        error_log('Session reset - Balance: 100000, Points: 1000');
        echo json_encode([
            'success' => true,
            'message' => 'Session reset',
            'balance' => 100000,
            'points' => 1000
        ]);
        exit;
    }
    
    // Initialize color balance and points if not set in session
    if (!isset($_SESSION['color_balance']) || !is_numeric($_SESSION['color_balance']) || $_SESSION['color_balance'] < 0) {
        $_SESSION['color_balance'] = 100000;
    }
    if (!isset($_SESSION['color_points']) || !is_numeric($_SESSION['color_points'])) {
        $_SESSION['color_points'] = 1000;
    }
    
    $balance = (float)$_SESSION['color_balance'];
    $points = (int)$_SESSION['color_points'];
    
    error_log('GET Balance Check - Balance: ' . $balance . ', Points: ' . $points);
    
    echo json_encode([
        'success' => true,
        'balance' => $balance,
        'points' => $points
    ]);
    exit;
}

// Enforce POST for betting actions
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST.']);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    return true;
});

// Debug: Log incoming request
error_log('Color Match Request: ' . json_encode($_POST));

// Get the data from the request
$bettingOption = isset($_POST['betting_option']) ? trim($_POST['betting_option']) : null;
$color1 = isset($_POST['color1']) ? trim($_POST['color1']) : null;
$color2 = isset($_POST['color2']) ? trim($_POST['color2']) : null;
$color3 = isset($_POST['color3']) ? trim($_POST['color3']) : null;
$betAmount = isset($_POST['bet_amount']) ? floatval($_POST['bet_amount']) : 0;

// Valid colors
$validColors = ['red', 'pink', 'yellow', 'blue', 'green', 'white'];

// Validate inputs
if (!in_array($bettingOption, $validColors)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid betting option'
    ]);
    exit;
}

if (!in_array($color1, $validColors) || !in_array($color2, $validColors) || !in_array($color3, $validColors)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid color results'
    ]);
    exit;
}

if ($betAmount <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid bet amount'
    ]);
    exit;
}

// Initialize color balance and points if not set in session
if (!isset($_SESSION['color_balance']) || !is_numeric($_SESSION['color_balance']) || $_SESSION['color_balance'] < 0) {
    $_SESSION['color_balance'] = 100000;
}
if (!isset($_SESSION['color_points']) || !is_numeric($_SESSION['color_points'])) {
    $_SESSION['color_points'] = 1000;
}

error_log('POST Request - Balance: ' . $_SESSION['color_balance'] . ', Bet Amount: ' . $betAmount);

// Check if user has sufficient balance
if ($betAmount > $_SESSION['color_balance']) {
    echo json_encode([
        'success' => false,
        'message' => 'Insufficient balance',
        'newBalance' => $_SESSION['color_balance'],
        'newPoints' => $_SESSION['color_points']
    ]);
    exit;
}

// Count how many colors match the betting option
$matches = 0;
if ($color1 === $bettingOption) $matches++;
if ($color2 === $bettingOption) $matches++;
if ($color3 === $bettingOption) $matches++;

// Determine if the user won (at least 1 match)
$won = $matches > 0;

// Get the multiplier based on the number of matches
// 1 match = x2 points
// 2 matches = x5 points
// 3 matches = x15 points
$multipliers = [
    1 => 2,
    2 => 5,
    3 => 15
];

$multiplier = isset($multipliers[$matches]) ? $multipliers[$matches] : 0;

// Calculate winnings
$winnings = $won ? $betAmount * $multiplier : 0;

// Calculate points change (15-30 points randomly)
$pointsChange = rand(15, 30);

// Update balance
// First, deduct the bet amount
$_SESSION['color_balance'] -= $betAmount;

// Then add winnings if won
if ($won) {
    $_SESSION['color_balance'] += $winnings;
    $_SESSION['color_points'] += $pointsChange;
} else {
    // If lost, deduct points but don't let it go below 0
    $_SESSION['color_points'] -= $pointsChange;
    if ($_SESSION['color_points'] < 0) {
        $_SESSION['color_points'] = 0;
    }
}

// Make sure balance doesn't go below 0 (extra safety check)
if ($_SESSION['color_balance'] < 0) {
    $_SESSION['color_balance'] = 0;
}

// Prepare response
$response = [
    'success' => true,
    'color1' => $color1,
    'color2' => $color2,
    'color3' => $color3,
    'bettingOption' => $bettingOption,
    'betAmount' => $betAmount,
    'matches' => $matches,
    'won' => $won,
    'multiplier' => $won ? $multiplier : 0,
    'winnings' => $winnings,
    'pointsChange' => $won ? $pointsChange : -$pointsChange,
    'newBalance' => $_SESSION['color_balance'],
    'newPoints' => $_SESSION['color_points'],
    'message' => $won ? 
        "Congratulations! You got " . $matches . " " . ($matches === 1 ? "match" : "matches") . " and won ₱" . number_format($winnings, 2) . "!" :
        "Sorry! You lost ₱" . number_format($betAmount, 2) . ". No matches found."
];

echo json_encode($response);
?>
