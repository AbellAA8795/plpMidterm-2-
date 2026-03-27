<?php
session_start();
header('Content-Type: application/json');

// Handle GET request to fetch current balance and points from session
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Initialize dice balance and points if not set in session
    if (!isset($_SESSION['dice_balance']) || !is_numeric($_SESSION['dice_balance']) || $_SESSION['dice_balance'] < 0) {
        $_SESSION['dice_balance'] = 100000;
    }
    if (!isset($_SESSION['dice_points']) || !is_numeric($_SESSION['dice_points'])) {
        $_SESSION['dice_points'] = 1000;
    }
    
    $balance = (float)$_SESSION['dice_balance'];
    $points = (int)$_SESSION['dice_points'];
    
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

// Get the data from the request
$bettingOption = isset($_POST['betting_option']) ? intval(trim($_POST['betting_option'])) : null;
$diceTotal = isset($_POST['dice_total']) ? intval($_POST['dice_total']) : null;
$dice1 = isset($_POST['dice1']) ? intval($_POST['dice1']) : 0;
$dice2 = isset($_POST['dice2']) ? intval($_POST['dice2']) : 0;
$betAmount = isset($_POST['bet_amount']) ? floatval($_POST['bet_amount']) : 0;

// Validate inputs
if (!$bettingOption || $bettingOption < 2 || $bettingOption > 12) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid betting option'
    ]);
    exit;
}

if (!$diceTotal || $diceTotal < 2 || $diceTotal > 12) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid dice total'
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

// Initialize dice balance and points if not set in session
if (!isset($_SESSION['dice_balance'])) {
    $_SESSION['dice_balance'] = 100000;
}
if (!isset($_SESSION['dice_points'])) {
    $_SESSION['dice_points'] = 1000;
}

// Check if user has sufficient balance
if ($betAmount > $_SESSION['dice_balance']) {
    echo json_encode([
        'success' => false,
        'message' => 'Insufficient balance',
        'newBalance' => $_SESSION['dice_balance'],
        'newPoints' => $_SESSION['dice_points']
    ]);
    exit;
}

// Determine if the user won
$won = ($diceTotal == $bettingOption);

// Get the multiplier based on the dice total
$multipliers = [
    2 => 30,
    3 => 15,
    4 => 10,
    5 => 8,
    6 => 6,
    7 => 5,
    8 => 6,
    9 => 8,
    10 => 10,
    11 => 15,
    12 => 30
];

$multiplier = isset($multipliers[$bettingOption]) ? $multipliers[$bettingOption] : 0;

// Calculate winnings
$winnings = $won ? $betAmount * $multiplier : 0;

// Calculate points change (15-30 points randomly)
$pointsChange = rand(15, 30);

// Update balance
// First, deduct the bet amount
$_SESSION['dice_balance'] -= $betAmount;

// Then add winnings if won
if ($won) {
    $_SESSION['dice_balance'] += $winnings;
    $_SESSION['dice_points'] += $pointsChange;
} else {
    // If lost, deduct points but don't let it go below 0
    $_SESSION['dice_points'] -= $pointsChange;
    if ($_SESSION['dice_points'] < 0) {
        $_SESSION['dice_points'] = 0;
    }
}

// Make sure balance doesn't go below 0 (extra safety check)
if ($_SESSION['dice_balance'] < 0) {
    $_SESSION['dice_balance'] = 0;
}

// Prepare response
$response = [
    'success' => true,
    'diceTotal' => $diceTotal,
    'dice1' => $dice1,
    'dice2' => $dice2,
    'bettingOption' => $bettingOption,
    'betAmount' => $betAmount,
    'won' => $won,
    'multiplier' => $won ? $multiplier : 0,
    'winnings' => $winnings,
    'pointsChange' => $won ? $pointsChange : -$pointsChange,
    'newBalance' => $_SESSION['dice_balance'],
    'newPoints' => $_SESSION['dice_points'],
    'message' => $won ? 
        "Congratulations! You won ₱" . number_format($winnings, 2) . "!" :
        "Sorry! You lost ₱" . number_format($betAmount, 2) . ". The total was " . $diceTotal
];

echo json_encode($response);
?>
