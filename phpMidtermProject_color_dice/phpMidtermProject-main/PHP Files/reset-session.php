<?php
session_start();

// Reset each game's balance and points to initial values
$_SESSION['dice_balance'] = 100000;
$_SESSION['dice_points'] = 1000;

$_SESSION['color_balance'] = 100000;
$_SESSION['color_points'] = 1000;

$_SESSION['roulette_balance'] = 100000;
$_SESSION['roulette_points'] = 1000;

// Unset any old global session variables from previous implementation
unset($_SESSION['global_balance']);
unset($_SESSION['global_points']);

session_write_close();

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Session reset successfully - all games reset to balance: 100000, points: 0',
    'dice_balance' => $_SESSION['dice_balance'],
    'dice_points' => $_SESSION['dice_points'],
    'color_balance' => $_SESSION['color_balance'],
    'color_points' => $_SESSION['color_points'],
    'roulette_balance' => $_SESSION['roulette_balance'],
    'roulette_points' => $_SESSION['roulette_points']
]);
?>
