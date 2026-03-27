let selectedBettingOption = null;
let selectedButton = null;
let isRolling = false;
let currentBalance = 100000;
let currentPoints = 0;

// API endpoint for dice betting
const API_URL = (() => {
    if (window.location.hostname === '127.0.0.1' && window.location.port === '5500') {
        return 'http://127.0.0.1/Php/phpMidtermProject_color_dice/phpMidtermProject-main/PHP%20Files/dice.php';
    }
    if (window.location.hostname === '127.0.0.1' && window.location.port === '80') {
        return '/Php/phpMidtermProject_color_dice/phpMidtermProject-main/PHP%20Files/dice.php';
    }
    return '../PHP%20Files/dice.php';
})();

// Wait for DOM to be fully loaded
window.addEventListener('load', function() {
    syncBalanceFromServer();
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

function setupBettingButtons() {
    const buttons = document.querySelectorAll('.game-buttons button');
    console.log('Setting up ' + buttons.length + ' buttons');

    buttons.forEach((button, index) => {
        // Add click event listener
        button.addEventListener('click', function(e) {
            console.log('Click detected on button: ' + this.textContent);
            
            if (isRolling) return;

            // Remove styling from previously selected button
            if (selectedButton) {
                selectedButton.classList.remove('active');
                selectedButton.style.backgroundColor = 'transparent';
                selectedButton.style.color = 'aliceblue';
                selectedButton.style.fontWeight = 'normal';
            }

            // Apply styling to current button
            this.classList.add('active');
            this.style.backgroundColor = '#00ff00';
            this.style.color = 'black';
            this.style.fontWeight = 'bold';
            
            selectedButton = this;
            selectedBettingOption = this.textContent.trim();
            
            console.log('Selected: ' + selectedBettingOption);
        });
    });
}

function setupFormSubmission() {
    const form = document.getElementById('betForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmBet();
        });
    }
}

function confirmBet() {
    const betAmountInput = document.getElementById('betAmount');
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
        rollDice(betAmount);
    }
}

function rollDice(betAmount) {
    isRolling = true;
    const submitButton = document.querySelector('#betForm input[type="submit"]');
    submitButton.disabled = true;
    submitButton.value = 'Rolling...';

    // Animate dice rolling - rapid flashing through numbers
    const diceAnimationDuration = 2000; // 2 seconds of animation
    const animationInterval = 50; // Change dice every 50ms

    let elapsedTime = 0;
    const animationTimer = setInterval(() => {
        // Random dice values (1-6)
        const randomDice1 = Math.floor(Math.random() * 6) + 1;
        const randomDice2 = Math.floor(Math.random() * 6) + 1;

        updateDiceDisplay(randomDice1, randomDice2);

        elapsedTime += animationInterval;

        if (elapsedTime >= diceAnimationDuration) {
            clearInterval(animationTimer);
            
            // Generate final dice values
            const finalDice1 = Math.floor(Math.random() * 6) + 1;
            const finalDice2 = Math.floor(Math.random() * 6) + 1;
            
            updateDiceDisplay(finalDice1, finalDice2);

            // Send to PHP with the final result
            sendBetToPhp(finalDice1, finalDice2, betAmount);

            isRolling = false;
            submitButton.disabled = false;
            submitButton.value = 'Submit';
        }
    }, animationInterval);
}

function updateDiceDisplay(dice1, dice2) {
    // Update images
    document.getElementById('dice1-image').src = `../dice/${dice1}.png`;
    document.getElementById('dice2-image').src = `../dice/${dice2}.png`;

    // Update display values
    document.getElementById('dice1-value').textContent = dice1;
    document.getElementById('dice2-value').textContent = dice2;
}

function sendBetToPhp(dice1, dice2, betAmount) {
    const diceTotal = dice1 + dice2;
    const formData = new FormData();
    formData.append('betting_option', selectedBettingOption);
    formData.append('bet_amount', betAmount);
    formData.append('dice_total', diceTotal);
    formData.append('dice1', dice1);
    formData.append('dice2', dice2);

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

    // Clear the bet input
    document.getElementById('betAmount').value = '';

    // Reset button highlighting for next game
    if (selectedButton) {
        selectedButton.classList.remove('active');
        selectedButton = null;
    }
    selectedBettingOption = null;

    // Show result modal
    const resultHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; padding: 20px; background: rgba(0,0,0,0.9); border-radius: 10px; text-align: center; color: white; min-width: 320px; border: 2px solid ${data.won ? '#00ff00' : '#ff0000'};">
            <h3 style="margin: 0 0 10px 0;">🎲 Dice Result: ${data.diceTotal}</h3>
            <p style="margin: 5px 0;"><strong>Your Bet:</strong> ${data.bettingOption}</p>
            <p style="margin: 5px 0;"><strong>Bet Amount:</strong> ₱${parseFloat(data.betAmount).toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>Dice:</strong> ${data.dice1} + ${data.dice2}</p>
            <p style="margin: 10px 0; font-size: 18px; font-weight: bold; color: ${data.won ? '#00ff00' : '#ff0000'};">${data.won ? '✅ WON' : '❌ LOST'}</p>
            ${data.won ? `
                <p style="margin: 5px 0; color: #00ff00;"><strong>Multiplier: x${data.multiplier}</strong></p>
                <p style="margin: 5px 0; color: #00ff00; font-size: 18px;"><strong>Winnings: ₱${parseFloat(data.winnings).toFixed(2)}</strong></p>
                <p style="margin: 5px 0; color: #ffff00;"><strong>ELO Gained: +${data.pointsChange}</strong></p>
            ` : `
                <p style="margin: 5px 0; color: #ff6666; font-size: 18px;"><strong>Loss: -₱${parseFloat(data.betAmount).toFixed(2)}</strong></p>
                <p style="margin: 5px 0; color: #ff6666;"><strong>ELO Lost: -${Math.abs(data.pointsChange)}</strong></p>
            `}
            <p style="margin: 15px 0 5px 0; border-top: 1px solid #666; padding-top: 10px;"><strong>New Balance:</strong> ₱${data.newBalance.toFixed(2)}</p>
            <p style="margin: 5px 0;"><strong>ELO Ranking:</strong> ${data.newPoints}</p>
            <button onclick="resetGame()" style="margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Play Again</button>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.querySelector('[style*="position: fixed"]');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', resultHTML);
}

function resetGame() {
    // Clear bet amount input
    document.getElementById('betAmount').value = '';
    
    // Reset all buttons to clear any leftover highlighting
    const allButtons = document.querySelectorAll('.game-buttons button');
    allButtons.forEach(button => {
        button.classList.remove('active');
        button.style.backgroundColor = 'transparent';
        button.style.color = 'aliceblue';
        button.style.fontWeight = 'normal';
    });
    
    selectedButton = null;
    selectedBettingOption = null;
    
    // Reset dice display to initial state
    document.getElementById('dice1-image').src = '../dice/1.png';
    document.getElementById('dice2-image').src = '../dice/2.png';
    document.getElementById('dice1-value').textContent = '1';
    document.getElementById('dice2-value').textContent = '2';
    
    // Close the modal
    const modal = document.querySelector('[style*="position: fixed"]');
    if (modal) {
        modal.remove();
    }
    
    // Re-enable the submit button
    isRolling = false;
    const submitButton = document.querySelector('#betForm input[type="submit"]');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.value = 'Submit';
    }
}
