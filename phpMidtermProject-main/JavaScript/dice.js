let selectedBettingOption = null;
let selectedButton = null;
let isRolling = false;
let currentBalance = 100000;
let currentPoints = 0;

// Tutorial Modal Variables
let currentSlide = 1;
const totalSlides = 3;

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
    setupDropdownMenu();
    setupTutorialModal();
    setupGameHistoryModal();
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

/* DROPDOWN MENU FUNCTIONS */
function setupDropdownMenu() {
    const hamburgerIcon = document.getElementById('hamburgerIcon');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const dropdownItems = document.querySelectorAll('.dropdown-item');

    // Toggle dropdown on hamburger click
    hamburgerIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    // Add click handlers for dropdown items
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const buttonText = this.textContent.trim();
            handleDropdownItemClick(buttonText);
            dropdownMenu.classList.remove('active');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!hamburgerIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });
}

function handleDropdownItemClick(itemText) {
    console.log('Dropdown item clicked: ' + itemText);
    
    switch(itemText) {
        case 'Tutorial':
            handleTutorial();
            break;
        case 'Game History':
            handleGameHistory();
            break;
        case 'Logout':
            handleLogout();
            break;
        default:
            console.log('Unknown menu item: ' + itemText);
    }
}

function handleTutorial() {
    openTutorialModal();
}

function handleGameHistory() {
    setupGameHistoryModal();
}

function handleLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
        // Redirect to reset session or logout page
        window.location.href = '../PHP%20Files/reset-session.php';
    }
}

/* TUTORIAL MODAL FUNCTIONS */
function setupTutorialModal() {
    const closeBtn = document.getElementById('closeModal');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const modal = document.getElementById('tutorialModal');

    // Close button event
    closeBtn.addEventListener('click', closeTutorialModal);

    // Arrow buttons event
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    // Close modal when clicking on overlay
    const overlay = document.querySelector('.tutorial-overlay');
    overlay.addEventListener('click', closeTutorialModal);

    // Prevent closing when clicking on card
    const card = document.querySelector('.tutorial-card');
    card.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

function openTutorialModal() {
    const modal = document.getElementById('tutorialModal');
    currentSlide = 1;
    updateSlideContent();
    modal.classList.add('active');
}

function closeTutorialModal() {
    const modal = document.getElementById('tutorialModal');
    modal.classList.remove('active');
}

function nextSlide() {
    if (currentSlide < totalSlides) {
        currentSlide++;
        updateSlideContent();
    }
}

function prevSlide() {
    if (currentSlide > 1) {
        currentSlide--;
        updateSlideContent();
    }
}

function updateSlideContent() {
    // Update slide number display
    document.getElementById('slideNumber').textContent = currentSlide;

    // Update slide content - customize each slide with different content
    // INSTRUCTIONS: Use the switch statement below to add unique content for each slide
    // You can add text, images, or HTML content for each slide number
    // 
    // EXAMPLES:
    // For text only:
    //   case 1:
    //       content.innerHTML = `<h2>Welcome to the Dice Game</h2><p>This is your introduction text.</p>`;
    //       break;
    //
    // For images only:
    //   case 2:
    //       content.innerHTML = `<img src="../path/to/your/image.png" alt="Slide 2" style="width: 100%; max-width: 500px;">`;
    //       break;
    //
    // For images + text:
    //   case 3:
    //       content.innerHTML = `
    //           <img src="../path/to/your/image.png" alt="Slide 3" style="width: 100%; max-width: 500px; margin-bottom: 20px;">
    //           <h3>Step 3: How to Play</h3>
    //           <p>This is the explanation text below the image.</p>
    //       `;
    //       break;

    const content = document.querySelector('.tutorial-content');
    
    // Replace the switch statement below with your custom content
    switch(currentSlide) {
        case 1:
            content.innerHTML = `
            
            <h1>Dice Game Tutorial</h1>
            <div>
            
            <ol>
                <li>The player places a bet using Crystalline Points.</li>
                <li>The player selects a Dice Pattern (sum from 2 to 12).</li>
                <li>The system rolls two dice (values from 1 to 6).</li>
                <li> The values are added to get the final result (2–12).</li>
                <li> If the result matches the player’s bet, they win based on the payout multiplier.</li>
                <li>If not, the bet is lost.</li>
            </ol>
            </div>
            
            `;
            break;
        case 2:
            content.innerHTML = `<h1>Color Game Tutorial</h1>
            <div>
            
            <ol>
                <li>The player places a bet using Crystalline Points.</li>
                <li>The player selects a color (Red, Pink, Yellow, Blue, Green, or White).</li>
                <li>The system rolls three color dice.</li>
                <li>The results are revealed.</li>
                <li>The player wins depending on how many dice match the selected color. </li>
                
            </ol>
            </div>
            
            `;
            break;
        case 3:
            content.innerHTML = `<h1>Roulette Game Tutorial</h1>
            <div>
            
            <ol>
                <li>The player places a bet using Crystalline Points.</li>
                <li>The player selects one betting pattern.</li>
                <li>The game will select a random number from 1 to 30.</li>
                <li>If the result matches the selected pattern, the player wins based on the payout rules.</li>
                <li>If not, the player loses that Crystalline Points amount. </li>
                
            </ol>
            </div>
            
            `;
            break;
        default:
            content.innerHTML = `<p>Slide ${currentSlide} content goes here</p>`;
    }

    // Disable/enable arrow buttons based on current slide
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');

    prevBtn.disabled = currentSlide === 1;
    nextBtn.disabled = currentSlide === totalSlides;

    // Update button styling
    prevBtn.style.opacity = currentSlide === 1 ? '0.5' : '1';
    nextBtn.style.opacity = currentSlide === totalSlides ? '0.5' : '1';
}

// Setup Game History Modal
function setupGameHistoryModal() {
    const gameHistoryButton = document.querySelector('.dropdown-item:nth-child(2)'); // Assuming the second dropdown item is Game History
    const gameHistoryModal = document.getElementById('gameHistoryModal');
    const closeButton = gameHistoryModal.querySelector('.close-button');

    gameHistoryButton.addEventListener('click', () => {
        gameHistoryModal.classList.remove('hidden');
    });

    closeButton.addEventListener('click', () => {
        gameHistoryModal.classList.add('hidden');
    });
}



