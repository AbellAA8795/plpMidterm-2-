<?php
session_start();
header('Content-Type: application/json');

// Handle GET requests to fetch balance
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Initialize roulette balance and points if not set in session
    if (!isset($_SESSION['roulette_balance'])) {
        $_SESSION['roulette_balance'] = 100000;
    }
    if (!isset($_SESSION['roulette_points'])) {
        $_SESSION['roulette_points'] = 1000;
    }
    
    echo json_encode([
        'success' => true,
        'balance' => $_SESSION['roulette_balance'],
        'points' => $_SESSION['roulette_points']
    ]);
    exit;
}

// Enforce POST for betting actions, and return a JSON response if method is wrong.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([ 'success' => false, 'message' => 'Method Not Allowed. Use POST.' ]);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    return true;
});

// Initialize roulette balance and points if not set in session
if (!isset($_SESSION['roulette_balance'])) {
    $_SESSION['roulette_balance'] = 100000;
}
if (!isset($_SESSION['roulette_points'])) {
    $_SESSION['roulette_points'] = 1000;
}

// Get the landed number from the wheel and the betting option
$landedNumber = isset($_POST['landed_number']) ? intval($_POST['landed_number']) : null;
$bettingOption = isset($_POST['betting_option']) ? $_POST['betting_option'] : null;
$betAmount = isset($_POST['bet_amount']) ? floatval($_POST['bet_amount']) : null;

// Validate inputs
if (!$landedNumber) {
    echo json_encode([
        'success' => false,
        'message' => 'No number from the wheel',
            'newBalance' => $_SESSION['roulette_balance'],
            'newPoints' => $_SESSION['roulette_points']
        ]);
        exit;
    }

    if (!$bettingOption) {
        echo json_encode([
            'success' => false,
            'message' => 'No betting option selected',
            'newBalance' => $_SESSION['roulette_balance'],
            'newPoints' => $_SESSION['roulette_points']
        ]);
        exit;
    }

    if (!$betAmount || $betAmount <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid bet amount',
            'newBalance' => $_SESSION['roulette_balance'],
            'newPoints' => $_SESSION['roulette_points']
        ]);
        exit;
    }

    // Check if user has sufficient balance
    if ($betAmount > $_SESSION['roulette_balance']) {
        echo json_encode([
            'success' => false,
            'message' => 'Insufficient balance',
            'newBalance' => $_SESSION['roulette_balance'],
            'newPoints' => $_SESSION['roulette_points']
        ]);
        exit;
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
        // This requires comparing with previous result
        // Store previous number in session
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

// Update balance
// First, deduct the bet amount
$_SESSION['roulette_balance'] -= $betAmount;

// Then add winnings if won
if ($won) {
    $_SESSION['roulette_balance'] += $winnings;
    $_SESSION['roulette_points'] += $pointsChange;
} else {
    // If lost, deduct points but don't let it go below 0
    $_SESSION['roulette_points'] -= $pointsChange;
    if ($_SESSION['roulette_points'] < 0) {
        $_SESSION['roulette_points'] = 0;
    }
}

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
    'newBalance' => $_SESSION['roulette_balance'],
    'newPoints' => $_SESSION['roulette_points'],
    'message' => $won ? "Congratulations! You won ₱" . number_format($winnings, 2) : "Sorry! You lost. The number was " . $randomNumber
];

echo json_encode($response);
?>

