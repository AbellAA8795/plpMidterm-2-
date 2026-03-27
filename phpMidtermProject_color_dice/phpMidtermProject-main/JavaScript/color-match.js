let selectedBettingOption = null;
let selectedButton = null;
let isRolling = false;
let currentBalance = 100000;
let currentPoints = 0;

const COLORS = ['red', 'pink', 'yellow', 'blue', 'green', 'white'];

const colorMap = {
    'red': '#FF0000',
    'pink': '#FFC0CB',
    'yellow': '#FFFF00',
    'blue': '#0000FF',
    'green': '#008000',
    'white': '#FFFFFF'
};

const API_URL = '../PHP%20Files/color-match.php';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Loaded - Setting up game');
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
                console.log('Balance synced from server:', currentBalance);
            }
        })
        .catch(error => {
            console.error('Failed to sync balance:', error);
            console.log('Using default balance: 100000');
        });
}

function resetSession() {
    console.log('Resetting session...');
    fetch(API_URL + '?action=reset')
        .then(response => response.json())
        .then(data => {
            console.log('Session reset response:', data);
            currentBalance = 100000;
            currentPoints = 0;
            document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
            document.getElementById('userElo').textContent = currentPoints;
            alert('Session reset successfully! Balance restored to ₱100000');
        })
        .catch(error => {
            console.error('Failed to reset session:', error);
            alert('Error resetting session');
        });
}

function setupBettingButtons() {
    const buttons = document.querySelectorAll('.game-button');
    console.log('Found ' + buttons.length + ' color buttons');

    buttons.forEach((button) => {
        button.addEventListener('click', function() {
            if (isRolling) return;

            const color = this.getAttribute('data-color');
            console.log('Color clicked: ' + color);

            if (selectedButton) {
                selectedButton.style.transform = 'scale(1)';
                selectedButton.style.boxShadow = 'none';
                selectedButton.style.border = 'none';
            }

            this.style.transform = 'scale(1.05)';
            this.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.3)';
            this.style.border = '3px solid white';
            
            selectedButton = this;
            selectedBettingOption = color;
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

    console.log('Confirm Bet - Bet Amount Input:', betAmount);
    console.log('Confirm Bet - Current Balance:', currentBalance);

    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
        alert('Please enter a valid bet amount!');
        return;
    }

    if (!selectedBettingOption) {
        alert('Please select a betting option (color)!');
        return;
    }

    const betAmountNum = parseFloat(betAmount);
    console.log('Confirm Bet - Parsed Bet Amount:', betAmountNum, 'Current Balance:', currentBalance, 'Check Result:', betAmountNum <= currentBalance);

    if (betAmountNum > currentBalance) {
        alert('Insufficient balance! Your current balance is ₱' + currentBalance.toFixed(2));
        return;
    }

    const confirmed = confirm(`Confirm Your Bet?\n\nBetting Option: ${selectedBettingOption.toUpperCase()}\nBet Amount: ₱${parseFloat(betAmount).toFixed(2)}`);

    if (confirmed) {
        rollColors(betAmount);
    }
}

function rollColors(betAmount) {
    isRolling = true;
    const submitButton = document.querySelector('#betForm input[type="submit"]');
    submitButton.disabled = true;
    submitButton.value = 'Rolling...';

    const colorAnimationDuration = 2000;
    const animationInterval = 50;

    let elapsedTime = 0;
    const animationTimer = setInterval(() => {
        const randomColor1 = COLORS[Math.floor(Math.random() * COLORS.length)];
        const randomColor2 = COLORS[Math.floor(Math.random() * COLORS.length)];
        const randomColor3 = COLORS[Math.floor(Math.random() * COLORS.length)];

        updateColorDisplay(randomColor1, randomColor2, randomColor3);
        elapsedTime += animationInterval;

        if (elapsedTime >= colorAnimationDuration) {
            clearInterval(animationTimer);
            
            const finalColor1 = COLORS[Math.floor(Math.random() * COLORS.length)];
            const finalColor2 = COLORS[Math.floor(Math.random() * COLORS.length)];
            const finalColor3 = COLORS[Math.floor(Math.random() * COLORS.length)];
            
            updateColorDisplay(finalColor1, finalColor2, finalColor3);
            sendBetToPhp(finalColor1, finalColor2, finalColor3, betAmount);

            isRolling = false;
            submitButton.disabled = false;
            submitButton.value = 'Submit';
        }
    }, animationInterval);
}

function updateColorDisplay(color1, color2, color3) {
    document.getElementById('color1').style.backgroundColor = colorMap[color1];
    document.getElementById('color2').style.backgroundColor = colorMap[color2];
    document.getElementById('color3').style.backgroundColor = colorMap[color3];
}

function sendBetToPhp(color1, color2, color3, betAmount) {
    const formData = new FormData();
    formData.append('betting_option', selectedBettingOption);
    formData.append('bet_amount', betAmount);
    formData.append('color1', color1);
    formData.append('color2', color2);
    formData.append('color3', color3);

    console.log('Sending bet to PHP - Amount:', betAmount, 'Option:', selectedBettingOption, 'Colors:', color1, color2, color3);

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

        let data = JSON.parse(text);
        console.log('Server response:', data);

        if (!data.success) {
            console.error('Server error:', data);
            alert('Error: ' + (data.message || 'Unknown error occurred'));
            return;
        }

        displayResult(data);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred: ' + error.message);
    });
}

function displayResult(data) {
    currentBalance = parseFloat(data.newBalance) || 100000;
    currentPoints = parseInt(data.newPoints) || 0;

    document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
    document.getElementById('userElo').textContent = currentPoints;
    document.getElementById('betAmount').value = '';

    if (selectedButton) {
        selectedButton.style.transform = 'scale(1)';
        selectedButton.style.boxShadow = 'none';
        selectedButton.style.border = 'none';
        selectedButton = null;
    }
    selectedBettingOption = null;

    const bettingOption = (data.bettingOption || 'unknown').toUpperCase();
    const color1 = data.color1 || 'unknown';
    const color2 = data.color2 || 'unknown';
    const color3 = data.color3 || 'unknown';
    const matches = parseInt(data.matches) || 0;
    const won = data.won === true || data.won === 1;
    const betAmount = parseFloat(data.betAmount) || 0;
    const winnings = parseFloat(data.winnings) || 0;
    const multiplier = parseInt(data.multiplier) || 0;
    const eloChange = parseInt(data.pointsChange) || 0;
    console.log('Color Match Result - pointsChange:', data.pointsChange, 'eloChange:', eloChange);

    const resultHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; padding: 30px; background: rgba(0,0,0,0.95); border-radius: 10px; text-align: center; color: white; min-width: 380px; border: 3px solid ${won ? '#00ff00' : '#ff0000'}; font-family: 'Inter', sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 24px;">🎨 Colors Result</h3>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Your Bet:</strong> ${bettingOption}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Bet Amount:</strong> ₱${betAmount.toFixed(2)}</p>
            <p style="margin: 10px 0; font-size: 16px;"><strong>Colors:</strong> <span style="color: ${colorMap[color1] || '#888'}; font-weight: bold;">${color1}</span> | <span style="color: ${colorMap[color2] || '#888'}; font-weight: bold;">${color2}</span> | <span style="color: ${colorMap[color3] || '#888'}; font-weight: bold;">${color3}</span></p>
            <p style="margin: 15px 0; font-size: 16px;"><strong>Matches: ${matches}/3</strong></p>
            <p style="margin: 10px 0; font-size: 20px; font-weight: bold; color: ${won ? '#00ff00' : '#ff0000'};">${won ? '✅ WON' : '❌ LOST'}</p>
            ${won ? `
                <p style="margin: 5px 0; color: #00ff00; font-size: 16px;"><strong>Multiplier: x${multiplier}</strong></p>
                <p style="margin: 5px 0; color: #00ff00; font-size: 18px;"><strong>Winnings: ₱${winnings.toFixed(2)}</strong></p>
                <p style="margin: 5px 0; color: #ffff00; font-size: 16px;"><strong>ELO Gained: +${eloChange}</strong></p>
            ` : `
                <p style="margin: 5px 0; color: #ff6666; font-size: 18px;"><strong>Loss: -₱${betAmount.toFixed(2)}</strong></p>
                <p style="margin: 5px 0; color: #ff6666; font-size: 16px;"><strong>ELO Lost: -${Math.abs(eloChange)}</strong></p>
            `}
            <p style="margin: 15px 0 5px 0; border-top: 1px solid #666; padding-top: 10px; font-size: 16px;"><strong>New Balance:</strong> ₱${currentBalance.toFixed(2)}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>ELO Ranking:</strong> ${currentPoints}</p>
            <button onclick="resetGame()" style="margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;">Play Again</button>
        </div>
    `;

    const existingModal = document.querySelector('[style*="position: fixed"]');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', resultHTML);
}

function resetGame() {
    document.getElementById('betAmount').value = '';
    
    const allButtons = document.querySelectorAll('.game-button');
    allButtons.forEach(button => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = 'none';
        button.style.border = 'none';
    });

    selectedButton = null;
    selectedBettingOption = null;

    document.getElementById('color1').style.backgroundColor = '#888';
    document.getElementById('color2').style.backgroundColor = '#888';
    document.getElementById('color3').style.backgroundColor = '#888';

    const modal = document.querySelector('[style*="position: fixed"]');
    if (modal) modal.remove();
}
