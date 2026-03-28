<?php
// logout.php - Destroys user session and logs out
session_start();

// Destroy all session data
session_destroy();

// Return success response
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
?>
