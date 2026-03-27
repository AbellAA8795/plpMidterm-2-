<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');

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

// Check if request is POST
if ($_SERVER['REQUEST_METHOD'] != 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
    exit();
}

// Get the action
$action = isset($_POST['action']) ? $_POST['action'] : '';

if ($action == 'register') {
    handleRegistration($conn);
} elseif ($action == 'login') {
    handleLogin($conn);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid action: ' . $action
    ]);
}

$conn->close();

/**
 * Handle user registration
 */
function handleRegistration($conn) {
    // Get form data
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $confirmPassword = isset($_POST['confirmPassword']) ? $_POST['confirmPassword'] : '';

    // Validate inputs
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'All fields are required'
        ]);
        return;
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        return;
    }

    // Validate passwords match
    if ($password !== $confirmPassword) {
        echo json_encode([
            'success' => false,
            'message' => 'Passwords do not match'
        ]);
        return;
    }

    // Validate password length
    if (strlen($password) < 6) {
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters long'
        ]);
        return;
    }

    // Check if email already exists
    $check_email = $conn->prepare("SELECT id FROM tbl_accounts WHERE email = ?");
    if ($check_email === false) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $conn->error
        ]);
        return;
    }

    $check_email->bind_param("s", $email);
    $check_email->execute();
    $result = $check_email->get_result();

    if ($result->num_rows > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Email already exists'
        ]);
        $check_email->close();
        return;
    }
    $check_email->close();

    // Hash the password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Insert user into database
    $insert = $conn->prepare("INSERT INTO tbl_accounts (name, email, password) VALUES (?, ?, ?)");

    if ($insert === false) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $conn->error
        ]);
        return;
    }

    $insert->bind_param("sss", $name, $email, $hashed_password);

    if ($insert->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Error during registration: ' . $insert->error
        ]);
    }

    $insert->close();
}

/**
 * Handle user login
 */
function handleLogin($conn) {
    // Get form data
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    // Validate inputs
    if (empty($email) || empty($password)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email and password are required'
        ]);
        return;
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        return;
    }

    // Check if user exists
    $select = $conn->prepare("SELECT id, password FROM tbl_accounts WHERE email = ?");

    if ($select === false) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $conn->error
        ]);
        return;
    }

    $select->bind_param("s", $email);
    $select->execute();
    $result = $select->get_result();

    if ($result->num_rows == 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Email or password incorrect'
        ]);
        $select->close();
        return;
    }

    $user = $result->fetch_assoc();
    $select->close();

    // Verify password
    if (password_verify($password, $user['password'])) {

        echo json_encode([
            'success' => true,
            'message' => 'Login successful'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Email or password incorrect'
        ]);
    }
}
?>