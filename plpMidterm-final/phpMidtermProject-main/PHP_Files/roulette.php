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

// Handle GET requests to fetch balance from database
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
    echo json_encode([ 'success' => false, 'message' => 'Method Not Allowed. Use POST.' ]);
    exit();
}

// Get the landed number from the wheel and the betting option
$landedNumber = isset($_POST['landed_number']) ? intval($_POST['landed_number']) : null;
$bettingOption = isset($_POST['betting_option']) ? $_POST['betting_option'] : null;
$betAmount = isset($_POST['bet_amount']) ? floatval($_POST['bet_amount']) : null;

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

// Validate inputs
if (!$landedNumber) {
    echo json_encode([
        'success' => false,
        'message' => 'No number from the wheel',
        'newBalance' => $current_balance,
        'newPoints' => $current_points
    ]);
    exit();
}

if (!$bettingOption) {
    echo json_encode([
        'success' => false,
        'message' => 'No betting option selected',
        'newBalance' => $current_balance,
        'newPoints' => $current_points
    ]);
    exit();
}

if (!$betAmount || $betAmount <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid bet amount',
        'newBalance' => $current_balance,
        'newPoints' => $current_points
    ]);
    exit();
}

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

// Use the landed number from the wheel
$randomNumber = $landedNumber;

// Determine if the user won and calculate the multiplier
$won = false;
$multiplier = 0;

switch ($bettingOption) {
    case 'Low Bet':
        $won = ($randomNumber >= 1 && $randomNumber <= 15);
        $multiplier = 2;
        break;

    case 'High Bet':
        $won = ($randomNumber >= 16 && $randomNumber <= 30);
        $multiplier = 2;
        break;

    case 'Prime':
        $primeNumbers = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
        $won = in_array($randomNumber, $primeNumbers);
        $multiplier = 3;
        break;

    case 'Odd':
        $won = ($randomNumber % 2 != 0);
        $multiplier = 2;
        break;

    case 'Even':
        $won = ($randomNumber % 2 == 0);
        $multiplier = 2;
        break;

    case 'Time Travel':
        if (isset($_SESSION['previous_number'])) {
            $won = ($randomNumber == $_SESSION['previous_number']);
        } else {
            $won = false;
        }
        $_SESSION['previous_number'] = $randomNumber;
        $multiplier = 30;
        break;

    case 'Peak':
        $won = ($randomNumber == 30);
        $multiplier = 30;
        break;

    case 'Valley':
        $won = ($randomNumber == 1);
        $multiplier = 30;
        break;

    case 'First Range':
        $won = ($randomNumber >= 1 && $randomNumber <= 10);
        $multiplier = 2;
        break;

    case 'Second Range':
        $won = ($randomNumber >= 11 && $randomNumber <= 20);
        $multiplier = 2;
        break;

    case 'Third Range':
        $won = ($randomNumber >= 21 && $randomNumber <= 30);
        $multiplier = 2;
        break;

    case 'Luck 7':
        if ($randomNumber == 7) {
            $won = true;
        } else {
            $won = false;
        }
        $multiplier = 15;
        break;
}

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

// Insert game result into tbl_roulette
$result_status = $won ? 'WIN' : 'LOSS';
$insert_result = $conn->prepare("INSERT INTO tbl_roulette (user_id, result, number, date_played) VALUES (?, ?, ?, NOW())");

if ($insert_result === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Error saving game result'
    ]);
    exit();
}

$insert_result->bind_param("isi", $user_id, $result_status, $randomNumber);

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
    'randomNumber' => $randomNumber,
    'bettingOption' => $bettingOption,
    'betAmount' => $betAmount,
    'won' => $won,
    'multiplier' => $won ? $multiplier : 0,
    'winnings' => $winnings,
    'pointsChange' => $won ? $pointsChange : -$pointsChange,
    'newBalance' => $new_balance,
    'newPoints' => $new_points,
    'message' => $won ? "Congratulations! You won ₱" . number_format($winnings, 2) : "Sorry! You lost. The number was " . $randomNumber
];

echo json_encode($response);
$conn->close();
?>

