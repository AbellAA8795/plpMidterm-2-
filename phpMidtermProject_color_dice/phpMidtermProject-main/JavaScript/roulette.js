let selectedBettingOption = null;
const wheel = document.getElementById('wheel');
const resultDiv = document.getElementById('result');
let isSpinning = false;
let currentBalance = 100000;
let currentPoints = 0;

// Keep a stable PHP endpoint path that works in both Live Server and XAMPP
const API_URL = (() => {
    // When using Live Server (5500), use XAMPP backend path
    if (window.location.hostname === '127.0.0.1' && window.location.port === '5500') {
        return 'http://127.0.0.1/Php/phpMidtermProject_color_dice/phpMidtermProject-main/PHP%20Files/roulette.php';
    }

    // When loaded from XAMPP directly
    if (window.location.hostname === '127.0.0.1' && window.location.port === '80') {
        return '/Php/phpMidtermProject_color_dice/phpMidtermProject-main/PHP%20Files/roulette.php';
    }

    // fallback to the relative PHP path
    return '../PHP%20Files/roulette.php';
})();

document.addEventListener('DOMContentLoaded', function() {
    syncBalanceFromServer();
    initializeWheel();
    setupBettingButtons();
    setupFormSubmission();
});

function syncBalanceFromServer() {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentBalance = parseFloat(data.balance) || 100000;
                currentPoints = parseInt(data.points) || 0;
                document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
                document.getElementById('userElo').textContent = currentPoints;
                console.log('Balance synced from server:', currentBalance, 'Points:', currentPoints);
            }
        })
        .catch(error => {
            console.error('Failed to sync balance:', error);
            console.log('Using default balance: 100000');
        });
}

function initializeWheel() {
    // Clear wheel first
    wheel.innerHTML = '';

    for (let i = 1; i <= 30; i++) {
        const angle = (i - 1) * 12; // 12 degrees per number
        const number = document.createElement('div');
        number.textContent = i;
        number.style.position = 'absolute';
        number.style.width = '100%';
        number.style.height = '100%';
        number.style.display = 'flex';
        number.style.alignItems = 'center';
        number.style.justifyContent = 'center';
        number.style.fontSize = '18px';
        number.style.fontWeight = 'bold';
        number.style.color = 'white';
        number.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
        number.style.transform = `rotate(${angle}deg) translateY(-170px)`;

        wheel.appendChild(number);
    }
}

function setupBettingButtons() {
    const bettingButtons = document.querySelectorAll('.game-buttons button');

    bettingButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            if (isSpinning) return;

            // Remove active class from all buttons
            bettingButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Store the selected option
            selectedBettingOption = this.textContent.trim();
            console.log('Selected: ' + selectedBettingOption);
        });
    });
}

function setupFormSubmission() {
    const form = document.querySelector('.betting-input form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        confirmBet();
    });
}

function confirmBet() {
    const betAmountInput = document.querySelector('.betting-input input[type="text"]');
    const betAmount = betAmountInput.value.trim();

    // Validation: Check if bet amount is entered
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
        alert('Please enter a valid bet amount!');
        return;
    }

    // Validation: Check if betting option is selected
    if (!selectedBettingOption) {
        alert('Please select a betting option!');
        return;
    }

    // Validation: Check if user has sufficient balance
    if (parseFloat(betAmount) > currentBalance) {
        alert('Insufficient balance! Your current balance is ₱' + currentBalance.toFixed(2));
        return;
    }

    // Confirmation dialog
    const confirmed = confirm(`Confirm Your Bet?\n\nBetting Option: ${selectedBettingOption}\nBet Amount: ₱${parseFloat(betAmount).toFixed(2)}`);

    if (confirmed) {
        spinRoulette(betAmount);
    }
}

function spinRoulette(betAmount) {
    isSpinning = true;
    resultDiv.innerHTML = '';
    const submitButton = document.querySelector('.betting-input input[type="submit"]');
    submitButton.disabled = true;
    submitButton.value = 'Spinning...';

    // Generate random spin rotation (5 full rotations + random angle)
    const randomSpin = Math.floor(Math.random() * 360);
    const totalRotation = 5 * 360 + randomSpin;

    wheel.classList.add('spinning');

    setTimeout(() => {
        wheel.classList.remove('spinning');
        wheel.style.transform = `rotate(${totalRotation}deg)`;

        // Calculate which number the wheel landed on
        const landedNumber = calculateLandedNumber(totalRotation);

        // Send to PHP with the actual landed number
        sendBetToPhp(landedNumber, betAmount);

        isSpinning = false;
        submitButton.disabled = false;
        submitButton.value = 'Submit';
    }, 3000);
}

function calculateLandedNumber(rotation) {
    // Normalize rotation to 0-360 range
    const normalizedRotation = rotation % 360;

    // The pointer is at the TOP of the wheel (0°)
    // Numbers 1-30 are arranged clockwise starting from 0°
    // Each number occupies 12 degrees (360° / 30 numbers)
    // 
    // When the wheel rotates by R degrees clockwise:
    // - The number now at position 0° is the one that was initially at (360 - R)°
    // - We need to find which number was at that initial angle
    
    // Calculate the initial angle of the number now at the pointer
    const initialAngle = (360 - normalizedRotation) % 360;
    
    // Calculate which 12-degree sector this angle belongs to
    // Add 6 to round to nearest sector for more accurate positioning
    let landedNumber = Math.floor((initialAngle + 6) / 12) + 1;
    
    // Handle wrap-around (if we get 31, it wraps to 1)
    if (landedNumber > 30) {
        landedNumber = landedNumber - 30;
    }

    console.log(`Rotation: ${rotation}°, Normalized: ${normalizedRotation}°, Initial Angle: ${initialAngle}°, Number: ${landedNumber}`);
    
    return landedNumber;
}

function sendBetToPhp(landedNumber, betAmount) {
    const formData = new FormData();
    formData.append('betting_option', selectedBettingOption);
    formData.append('bet_amount', betAmount);
    formData.append('landed_number', landedNumber);

    fetch(API_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${text}`);
            });
        }
        return response.text();
    })
    .then(text => {
        if (!text) {
            throw new Error('Empty response from server');
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON response:', text);
            alert('Server returned invalid JSON. See console for details.');
            return;
        }

        displayResult(data);
    })
    .catch(error => {
        console.error('Fetch Error:', error);
        alert('An error occurred: ' + error.message);
    });
}

function displayResult(data) {
    // Update balance and points
    currentBalance = data.newBalance;
    currentPoints = data.newPoints;

    // Update UI
    document.getElementById('userBalance').textContent = '₱ ' + data.newBalance.toFixed(2);
    document.getElementById('userElo').textContent = data.newPoints;

    // Calculate money lost (always bet amount)
    const moneyLost = data.betAmount;
    
    // Calculate money gained (only if won)
    const moneyGained = data.won ? data.winnings : 0;
    
    // Get points gained (only if won)
    const pointsGained = data.won ? data.pointsChange : 0;

    const resultHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; padding: 20px; background: rgba(0,0,0,0.9); border-radius: 10px; text-align: center; color: white; min-width: 320px; border: 2px solid ${data.won ? '#00ff00' : '#ff4444'};">
            <h3 style="margin: 0 0 15px 0; font-size: 28px;">Result: ${data.randomNumber}</h3>
            <p style="margin: 8px 0;"><strong>Your Bet:</strong> ${data.bettingOption}</p>
            <p style="margin: 8px 0;"><strong>Bet Amount:</strong> ₱${parseFloat(data.betAmount).toFixed(2)}</p>
            <p style="margin: 8px 0;"><strong>Status:</strong> ${data.won ? '✅ WON' : '❌ LOST'}</p>
            ${data.won ? `
                <p style="margin: 8px 0; color: #00ff00;"><strong>Multiplier: x${data.multiplier}</strong></p>
                <p style="margin: 8px 0; color: #00ff00; font-size: 18px;"><strong>💰 Won: +₱${parseFloat(data.winnings).toFixed(2)}</strong></p>
                <p style="margin: 8px 0; color: #ffdd00;"><strong>⭐ Points Gained: +${data.pointsChange}</strong></p>
            ` : `
                <p style="margin: 8px 0; color: #ff6666; font-size: 18px;"><strong>💸 Lost: -₱${parseFloat(moneyLost).toFixed(2)}</strong></p>
                <p style="margin: 8px 0; color: #ffcccc;"><strong>⭐ Points Lost: ${data.pointsChange}</strong></p>
            `}
            <p style="margin: 12px 0; font-size: 13px; color: #aaa;">Balance: ₱${parseFloat(data.newBalance).toFixed(2)} | Points: ${data.newPoints}</p>
            <p style="margin: 10px 0; font-size: 14px;">${data.message}</p>
            <button onclick="resetGame()" style="margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Play Again</button>
        </div>
    `;

    resultDiv.innerHTML = resultHTML;
}

function resetGame() {
    const betAmountInput = document.querySelector('.betting-input input[type="text"]');
    betAmountInput.value = '';
    
    // Reset wheel rotation
    wheel.style.transform = 'rotate(0deg)';
    
    // Remove active class from all buttons
    const bettingButtons = document.querySelectorAll('.game-buttons button');
    bettingButtons.forEach(btn => btn.classList.remove('active'));

    // Clear result display
    resultDiv.innerHTML = '';
    
    // Reset selected option
    selectedBettingOption = null;
    
    // Sync balance from server
    syncBalanceFromServer();
}

function syncBalanceFromServer() {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentBalance = parseFloat(data.balance) || 100000;
                currentPoints = parseInt(data.points) || 0;
                document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
                document.getElementById('userElo').textContent = currentPoints;
            }
        })
        .catch(error => {
            console.error('Error syncing balance:', error);
        });
}
