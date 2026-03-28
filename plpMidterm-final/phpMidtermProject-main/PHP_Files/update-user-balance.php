<?php
// update-user-balance.php - Update user balance and points after a game
error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');
include 'config.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'User not logged in'
    ]);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit();
}

// Get balance and points from POST
$new_balance = isset($_POST['balance']) ? floatval($_POST['balance']) : null;
$new_points = isset($_POST['points']) ? intval($_POST['points']) : null;

if ($new_balance === null || $new_points === null) {
    echo json_encode([
        'success' => false,
        'message' => 'Balance and points are required'
    ]);
    exit();
}

// Ensure balance and points don't go below 0
$new_balance = max(0, $new_balance);
$new_points = max(0, $new_points);

// Update user balance and points in database
$update = $conn->prepare("UPDATE tbl_accounts SET balance = ?, points = ? WHERE id = ?");

if ($update === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $conn->error
    ]);
    exit();
}

$user_id = $_SESSION['user_id'];
$update->bind_param("dii", $new_balance, $new_points, $user_id);

if ($update->execute()) {
    // Update session variables
    $_SESSION['balance'] = $new_balance;
    $_SESSION['points'] = $new_points;
    
    echo json_encode([
        'success' => true,
        'message' => 'Balance updated successfully',
        'balance' => $new_balance,
        'points' => $new_points
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Error updating balance: ' . $update->error
    ]);
}

$update->close();
$conn->close();
?>
