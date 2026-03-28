<?php
// get-user-info.php - Get current logged-in user information
error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'User not logged in'
    ]);
    exit();
}

// Return user information
echo json_encode([
    'success' => true,
    'user_id' => $_SESSION['user_id'],
    'user_name' => $_SESSION['user_name'],
    'user_email' => $_SESSION['user_email'],
    'balance' => $_SESSION['balance'],
    'points' => $_SESSION['points']
]);
?>
