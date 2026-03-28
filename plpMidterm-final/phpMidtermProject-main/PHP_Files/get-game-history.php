<?php
// get-game-history.php - Returns game history for the logged-in user across all 3 games
error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

include 'config.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit();
}

$user_id = $_SESSION['user_id'];
$game    = isset($_GET['game']) ? trim($_GET['game']) : 'all';

$history = [];

// ---------- COLOR MATCH ----------
if ($game === 'all' || $game === 'colorgame') {
    $stmt = $conn->prepare(
        "SELECT result, color1, color2, color3, date_played
         FROM tbl_colorgame
         WHERE user_id = ?
         ORDER BY date_played DESC
         LIMIT 50"
    );
    if ($stmt) {
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $history['colorgame'][] = $row;
        }
        $stmt->close();
    }
}

// ---------- DICE ----------
if ($game === 'all' || $game === 'dice') {
    $stmt = $conn->prepare(
        "SELECT result, number, date_played
         FROM tbl_dice
         WHERE user_id = ?
         ORDER BY date_played DESC
         LIMIT 50"
    );
    if ($stmt) {
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $history['dice'][] = $row;
        }
        $stmt->close();
    }
}

// ---------- ROULETTE ----------
if ($game === 'all' || $game === 'roulette') {
    $stmt = $conn->prepare(
        "SELECT result, number, date_played
         FROM tbl_roulette
         WHERE user_id = ?
         ORDER BY date_played DESC
         LIMIT 50"
    );
    if ($stmt) {
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($row = $res->fetch_assoc()) {
            $history['roulette'][] = $row;
        }
        $stmt->close();
    }
}

$conn->close();

echo json_encode(['success' => true, 'history' => $history]);
?>
