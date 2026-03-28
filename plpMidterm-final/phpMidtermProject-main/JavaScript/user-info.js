// user-info.js - Script to fetch and display user information on all pages

// Function to fetch user info from server
async function displayUserInfo() {
    try {
        const response = await fetch('../PHP_Files/get-user-info.php', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
            // Update user name, balance, and points in the page
            updateUserDisplay(data);
        } else {
            // User not logged in, redirect to login page
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        // Redirect to login on error
        window.location.href = 'index.html';
    }
}

// Function to update the display with user information
function updateUserDisplay(userData) {
    // Update user name in top-right
    const userNameElement = document.querySelector('.name-currency:nth-child(1) p');
    if (userNameElement) {
        userNameElement.textContent = userData.user_name;
    }
    
    // Update balance in top-right
    const balanceElement = document.querySelector('.name-currency:nth-child(2) p');
    if (balanceElement) {
        balanceElement.textContent = '₱' + formatNumber(userData.balance);
    }
    
    // Update points in top-right (usually the third element)
    const pointsElement = document.querySelector('.name-currency:nth-child(3) p');
    if (pointsElement) {
        pointsElement.textContent = userData.points + ' pts';
    }
}

// Helper function to format numbers with commas
// FIX: parseFloat() converts the balance string from PHP into a number
// before calling toFixed() — previously this crashed with "num.toFixed is not a function"
// which caused the catch block to redirect back to the login page
function formatNumber(num) {
    return parseFloat(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Call the function when page loads
document.addEventListener('DOMContentLoaded', displayUserInfo);

// REMOVED: setInterval(displayUserInfo, 5000);
// This was causing the redirect loop — if the session check
// failed for any reason, it would boot the user back to login every 5 seconds.