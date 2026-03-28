<?php
session_start();
header('Content-Type: application/json');

error_reporting(E_ALL);
ini_set('display_errors', 0);

include 'config.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'User not logged in'
    ]);
    exit();
}

// Handle GET request to fetch current balance and points from database
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user_id = $_SESSION['user_id'];
    
    $select = $conn->prepare("SELECT balance, points FROM tbl_accounts WHERE id = ?");
    if ($select === false) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error'
        ]);
        exit();
    }
    
    $select->bind_param("i", $user_id);
    $select->execute();
    $result = $select->get_result();
    $user = $result->fetch_assoc();
    $select->close();
    
    if (!$user) {
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
        exit();
    }
    
    echo json_encode([
        'success' => true,
        'balance' => $user['balance'],
        'points' => $user['points']
    ]);
    $conn->close();
    exit();
}

// Enforce POST for betting actions
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST.']);
    exit();
}

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
    exit();
}

if (!$diceTotal || $diceTotal < 2 || $diceTotal > 12) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid dice total'
    ]);
    exit();
}

if ($betAmount <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid bet amount'
    ]);
    exit();
}

// Fetch current balance and points from database
$user_id = $_SESSION['user_id'];
$select = $conn->prepare("SELECT balance, points FROM tbl_accounts WHERE id = ?");

if ($select === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error'
    ]);
    exit();
}

$select->bind_param("i", $user_id);
$select->execute();
$result = $select->get_result();
$user = $result->fetch_assoc();
$select->close();

if (!$user) {
    echo json_encode([
        'success' => false,
        'message' => 'User not found'
    ]);
    exit();
}

$current_balance = $user['balance'];
$current_points = $user['points'];

// Check if user has sufficient balance
if ($betAmount > $current_balance) {
    echo json_encode([
        'success' => false,
        'message' => 'Insufficient balance',
        'newBalance' => $current_balance,
        'newPoints' => $current_points
    ]);
    exit();
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

// Calculate new balance and points
$new_balance = $current_balance - $betAmount;

if ($won) {
    $new_balance += $winnings;
    $new_points = $current_points + $pointsChange;
} else {
    $new_points = $current_points - $pointsChange;
}

// Ensure balance and points don't go below 0
$new_balance = max(0, $new_balance);
$new_points = max(0, $new_points);

// Update balance and points in database
$update = $conn->prepare("UPDATE tbl_accounts SET balance = ?, points = ? WHERE id = ?");

if ($update === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error'
    ]);
    exit();
}

$update->bind_param("dii", $new_balance, $new_points, $user_id);

if (!$update->execute()) {
    echo json_encode([
        'success' => false,
        'message' => 'Error updating balance'
    ]);
    $update->close();
    exit();
}

$update->close();

// Insert game result into tbl_dice
$result_status = $won ? 'WIN' : 'LOSS';
$insert_result = $conn->prepare("INSERT INTO tbl_dice (user_id, result, number, date_played) VALUES (?, ?, ?, NOW())");

if ($insert_result === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Error saving game result'
    ]);
    exit();
}

$insert_result->bind_param("isi", $user_id, $result_status, $diceTotal);

if (!$insert_result->execute()) {
    echo json_encode([
        'success' => false,
        'message' => 'Error saving game result'
    ]);
    $insert_result->close();
    exit();
}

$insert_result->close();

// Update session
$_SESSION['balance'] = $new_balance;
$_SESSION['points'] = $new_points;

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
    'newBalance' => $new_balance,
    'newPoints' => $new_points,
    'message' => $won ? 
        "Congratulations! You won ₱" . number_format($winnings, 2) . "!" :
        "Sorry! You lost ₱" . number_format($betAmount, 2) . ". The total was " . $diceTotal
];

echo json_encode($response);
$conn->close();
?>
