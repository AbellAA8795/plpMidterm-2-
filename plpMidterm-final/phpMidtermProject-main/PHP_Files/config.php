<?php
// Database configuration
$servername = "localhost";
$db_username = "root";
$db_password = "";
$database = "casino_db";

// Create connection
$conn = new mysqli($servername, $db_username, $db_password, $database);

// Check connection
if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]);
    exit();
}

// Set charset to utf8
$conn->set_charset("utf8");

// Define constants
define('DEFAULT_BALANCE', 1000);
define('DEFAULT_POINTS', 1000);
?>
