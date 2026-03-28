<?php
// get-probability.php - Returns win/frequency statistics per betting option for the logged-in user
error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

include 'config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit();
}

$user_id = $_SESSION['user_id'];
$game    = isset($_GET['game']) ? trim($_GET['game']) : '';

// ── COLOR MATCH ──────────────────────────────────────────────────────────────
if ($game === 'colorgame') {
    $stmt = $conn->prepare(
        "SELECT color1, color2, color3, result
         FROM tbl_colorgame
         WHERE user_id = ?
         ORDER BY date_played DESC
         LIMIT 50"
    );
    if (!$stmt) { echo json_encode(['success' => false, 'message' => 'DB error']); exit(); }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res  = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $colors    = ['red', 'pink', 'yellow', 'blue', 'green', 'white'];
    $totRounds = count($rows);
    $stats     = [];

    foreach ($colors as $color) {
        $appeared  = 0;  // rounds where this color appeared on at least 1 die
        $wonWhenBet = 0; // rounds where ≥1 die matched (i.e. would have won)
        foreach ($rows as $row) {
            $hits = 0;
            if ($row['color1'] === $color) $hits++;
            if ($row['color2'] === $color) $hits++;
            if ($row['color3'] === $color) $hits++;
            if ($hits > 0) {
                $appeared++;
                $wonWhenBet++;  // any match = win
            }
        }
        $stats[$color] = [
            'appeared'     => $appeared,
            'total'        => $totRounds,
            'appear_rate'  => $totRounds > 0 ? round($appeared / $totRounds * 100, 1) : 0,
            'win_rate'     => $totRounds > 0 ? round($wonWhenBet / $totRounds * 100, 1) : 0,
        ];
    }

    echo json_encode(['success' => true, 'total_rounds' => $totRounds, 'stats' => $stats]);
    $conn->close();
    exit();
}

// ── DICE ─────────────────────────────────────────────────────────────────────
if ($game === 'dice') {
    $stmt = $conn->prepare(
        "SELECT number, result
         FROM tbl_dice
         WHERE user_id = ?
         ORDER BY date_played DESC
         LIMIT 50"
    );
    if (!$stmt) { echo json_encode(['success' => false, 'message' => 'DB error']); exit(); }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res  = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $multipliers = [2=>30,3=>15,4=>10,5=>8,6=>6,7=>5,8=>6,9=>8,10=>10,11=>15,12=>30];
    $totRounds   = count($rows);

    // Count frequency of each sum
    $freq = array_fill(2, 11, 0);  // keys 2–12
    foreach ($rows as $row) {
        $n = intval($row['number']);
        if ($n >= 2 && $n <= 12) $freq[$n]++;
    }

    $stats = [];
    for ($sum = 2; $sum <= 12; $sum++) {
        $timesRolled = $freq[$sum];
        // Win rate = if you had bet on this sum, you would have won $timesRolled out of $totRounds
        $stats[$sum] = [
            'times_rolled' => $timesRolled,
            'total'        => $totRounds,
            'frequency'    => $totRounds > 0 ? round($timesRolled / $totRounds * 100, 1) : 0,
            'win_rate'     => $totRounds > 0 ? round($timesRolled / $totRounds * 100, 1) : 0,
            'multiplier'   => $multipliers[$sum],
        ];
    }

    echo json_encode(['success' => true, 'total_rounds' => $totRounds, 'stats' => $stats]);
    $conn->close();
    exit();
}

// ── ROULETTE ─────────────────────────────────────────────────────────────────
if ($game === 'roulette') {
    $stmt = $conn->prepare(
        "SELECT number, result
         FROM tbl_roulette
         WHERE user_id = ?
         ORDER BY date_played DESC
         LIMIT 50"
    );
    if (!$stmt) { echo json_encode(['success' => false, 'message' => 'DB error']); exit(); }
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $res  = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $totRounds = count($rows);
    $primes    = [2,3,5,7,11,13,17,19,23,29];

    // Define each betting option's win condition as a closure-friendly check
    $options = [
        'Low Bet'      => ['mult' => 2,  'check' => fn($n) => $n >= 1  && $n <= 15],
        'High Bet'     => ['mult' => 2,  'check' => fn($n) => $n >= 16 && $n <= 30],
        'Prime'        => ['mult' => 3,  'check' => fn($n) => in_array($n, [2,3,5,7,11,13,17,19,23,29])],
        'Odd'          => ['mult' => 2,  'check' => fn($n) => $n % 2 !== 0],
        'Even'         => ['mult' => 2,  'check' => fn($n) => $n % 2 === 0],
        'Peak'         => ['mult' => 30, 'check' => fn($n) => $n === 30],
        'Valley'       => ['mult' => 30, 'check' => fn($n) => $n === 1],
        'First Range'  => ['mult' => 2,  'check' => fn($n) => $n >= 1  && $n <= 10],
        'Second Range' => ['mult' => 2,  'check' => fn($n) => $n >= 11 && $n <= 20],
        'Third Range'  => ['mult' => 2,  'check' => fn($n) => $n >= 21 && $n <= 30],
        'Luck 7'       => ['mult' => 15, 'check' => fn($n) => $n === 7],
    ];

    $stats = [];
    foreach ($options as $label => $cfg) {
        $wins = 0;
        foreach ($rows as $row) {
            if (($cfg['check'])(intval($row['number']))) $wins++;
        }
        $losses = $totRounds - $wins;
        $stats[$label] = [
            'wins'       => $wins,
            'losses'     => $losses,
            'total'      => $totRounds,
            'win_rate'   => $totRounds > 0 ? round($wins / $totRounds * 100, 1) : 0,
            'multiplier' => $cfg['mult'],
        ];
    }

    echo json_encode(['success' => true, 'total_rounds' => $totRounds, 'stats' => $stats]);
    $conn->close();
    exit();
}

echo json_encode(['success' => false, 'message' => 'Unknown game type']);
$conn->close();
?>
