let selectedBettingOption = null;
let selectedButton = null;
let isRolling = false;
let currentBalance = 0;
let currentPoints  = 0;

// Tutorial Modal Variables
let currentSlide = 1;
const totalSlides = 3;

const API_URL = '../PHP_Files/dice.php';

window.addEventListener('load', function() {
    syncBalanceFromServer();
    setupBettingButtons();
    setupFormSubmission();
    setupDropdownMenu();
    setupTutorialModal();
    setupGameHistoryModal();
    setupNumberOnlyInput();
});

// ─── NUMBERS-ONLY INPUT ────────────────────────────────────────────────────────
function setupNumberOnlyInput() {
    const betInput = document.getElementById('betAmount');
    if (!betInput) return;
    betInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9.]/g, '');
        const parts = this.value.split('.');
        if (parts.length > 2) this.value = parts[0] + '.' + parts.slice(1).join('');
    });
    betInput.addEventListener('keydown', function(e) {
        const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End','.'];
        if (allowed.includes(e.key)) return;
        if (e.key >= '0' && e.key <= '9') return;
        e.preventDefault();
    });
}

// ─── BALANCE SYNC ─────────────────────────────────────────────────────────────
function syncBalanceFromServer() {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentBalance = parseFloat(data.balance) || 0;
                currentPoints  = parseInt(data.points)   || 0;
                document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
                document.getElementById('userElo').textContent     = currentPoints;
            }
        })
        .catch(error => console.error('Failed to sync balance:', error));
}

// ─── BETTING BUTTONS ──────────────────────────────────────────────────────────
function setupBettingButtons() {
    const buttons = document.querySelectorAll('.game-buttons button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            if (isRolling) return;
            if (selectedButton) {
                selectedButton.classList.remove('active');
                selectedButton.style.backgroundColor = 'transparent';
                selectedButton.style.color           = 'aliceblue';
                selectedButton.style.fontWeight      = 'normal';
            }
            this.classList.add('active');
            this.style.backgroundColor = '#00ff00';
            this.style.color           = 'black';
            this.style.fontWeight      = 'bold';
            selectedButton        = this;
            selectedBettingOption = this.textContent.trim();
        });
    });
}

function setupFormSubmission() {
    const form = document.getElementById('betForm');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); confirmBet(); });
}

function confirmBet() {
    const betAmountInput = document.getElementById('betAmount');
    const betAmount = betAmountInput.value.trim();
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) { alert('Please enter a valid bet amount!'); return; }
    if (!selectedBettingOption) { alert('Please select a betting option!'); return; }
    if (parseFloat(betAmount) > currentBalance) { alert('Insufficient balance! Your current balance is ₱' + currentBalance.toFixed(2)); return; }
    const confirmed = confirm(`Confirm Your Bet?\n\nBetting Option: ${selectedBettingOption}\nBet Amount: ₱${parseFloat(betAmount).toFixed(2)}`);
    if (confirmed) rollDice(betAmount);
}

// ─── ROLL ─────────────────────────────────────────────────────────────────────
function rollDice(betAmount) {
    isRolling = true;
    const submitButton = document.querySelector('#betForm input[type="submit"]');
    submitButton.disabled = true;
    submitButton.value    = 'Rolling...';

    let elapsedTime = 0;
    const animationTimer = setInterval(() => {
        updateDiceDisplay(Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1);
        elapsedTime += 50;
        if (elapsedTime >= 2000) {
            clearInterval(animationTimer);
            const fd1 = Math.floor(Math.random() * 6) + 1;
            const fd2 = Math.floor(Math.random() * 6) + 1;
            updateDiceDisplay(fd1, fd2);
            sendBetToPhp(fd1, fd2, betAmount);
            isRolling             = false;
            submitButton.disabled = false;
            submitButton.value    = 'Submit';
        }
    }, 50);
}

function updateDiceDisplay(d1, d2) {
    document.getElementById('dice1-image').src          = `../dice/${d1}.png`;
    document.getElementById('dice2-image').src          = `../dice/${d2}.png`;
    document.getElementById('dice1-value').textContent  = d1;
    document.getElementById('dice2-value').textContent  = d2;
}

function sendBetToPhp(dice1, dice2, betAmount) {
    const formData = new FormData();
    formData.append('betting_option', selectedBettingOption);
    formData.append('bet_amount',     betAmount);
    formData.append('dice_total',     dice1 + dice2);
    formData.append('dice1',          dice1);
    formData.append('dice2',          dice2);

    fetch(API_URL, { method: 'POST', body: formData })
        .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.text(); })
        .then(text => { if (!text) throw new Error('Empty response'); displayResult(JSON.parse(text)); })
        .catch(error => { console.error('Fetch Error:', error); alert('An error occurred: ' + error.message); });
}

// ─── DISPLAY RESULT + ZERO-BALANCE AD POPUP ───────────────────────────────────
function displayResult(data) {
    currentBalance = parseFloat(data.newBalance) || 0;
    currentPoints  = parseInt(data.newPoints)    || 0;

    document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
    document.getElementById('userElo').textContent     = currentPoints;
    document.getElementById('betAmount').value         = '';

    if (selectedButton) {
        selectedButton.classList.remove('active');
        selectedButton.style.backgroundColor = 'transparent';
        selectedButton.style.color           = 'aliceblue';
        selectedButton.style.fontWeight      = 'normal';
        selectedButton = null;
    }
    selectedBettingOption = null;

    const resultHTML = `
        <div id="resultModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:20px;background:rgba(0,0,0,0.9);border-radius:10px;text-align:center;color:white;min-width:320px;border:2px solid ${data.won ? '#00ff00' : '#ff0000'};">
            <h3 style="margin:0 0 10px 0;">🎲 Dice Result: ${data.diceTotal}</h3>
            <p style="margin:5px 0;"><strong>Your Bet:</strong> ${data.bettingOption}</p>
            <p style="margin:5px 0;"><strong>Bet Amount:</strong> ₱${parseFloat(data.betAmount).toFixed(2)}</p>
            <p style="margin:5px 0;"><strong>Dice:</strong> ${data.dice1} + ${data.dice2}</p>
            <p style="margin:10px 0;font-size:18px;font-weight:bold;color:${data.won ? '#00ff00' : '#ff0000'};">${data.won ? '✅ WON' : '❌ LOST'}</p>
            ${data.won ? `
                <p style="margin:5px 0;color:#00ff00;"><strong>Multiplier: x${data.multiplier}</strong></p>
                <p style="margin:5px 0;color:#00ff00;font-size:18px;"><strong>Winnings: ₱${parseFloat(data.winnings).toFixed(2)}</strong></p>
                <p style="margin:5px 0;color:#ffff00;"><strong>ELO Gained: +${data.pointsChange}</strong></p>
            ` : `
                <p style="margin:5px 0;color:#ff6666;font-size:18px;"><strong>Loss: -₱${parseFloat(data.betAmount).toFixed(2)}</strong></p>
                <p style="margin:5px 0;color:#ff6666;"><strong>ELO Lost: -${Math.abs(data.pointsChange)}</strong></p>
            `}
            <p style="margin:15px 0 5px 0;border-top:1px solid #666;padding-top:10px;"><strong>New Balance:</strong> ₱${currentBalance.toFixed(2)}</p>
            <p style="margin:5px 0;"><strong>ELO Ranking:</strong> ${currentPoints}</p>
            <button onclick="resetGame()" style="margin-top:15px;padding:10px 20px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;">Play Again</button>
        </div>`;

    const existing = document.getElementById('resultModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', resultHTML);

    if (currentBalance <= 0) setTimeout(showAdPopup, 400);
}

// ─── AD POPUP ─────────────────────────────────────────────────────────────────
function showAdPopup() {
    const existing = document.getElementById('adPopupOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id    = 'adPopupOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
        <div style="background:#1a1a2e;border:3px solid #f0c040;border-radius:16px;padding:40px 36px;text-align:center;color:white;max-width:420px;width:90%;font-family:'Inter',sans-serif;">
            <div style="font-size:48px;margin-bottom:10px;">📺</div>
            <h2 style="color:#f0c040;margin:0 0 10px 0;font-size:22px;">You're out of balance!</h2>
            <p style="color:#ccc;font-size:15px;margin:0 0 24px 0;">Watch a short ad to receive <strong style="color:#00ff99;">+100 ₱</strong> and keep playing!</p>
            <div style="display:flex;gap:14px;justify-content:center;">
                <button id="watchAdBtn" onclick="watchAd()" style="padding:12px 28px;background:linear-gradient(135deg,#f0c040,#e07b00);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold;">▶ Watch Ad</button>
                <button onclick="closeAdPopup()" style="padding:12px 28px;background:#444;color:#ccc;border:none;border-radius:8px;cursor:pointer;font-size:15px;">No Thanks</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
}

function watchAd() {
    const btn = document.getElementById('watchAdBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading ad...'; }
    let remaining = 5;
    if (btn) btn.textContent = `Watching... (${remaining}s)`;
    const timer = setInterval(() => {
        remaining--;
        if (btn) btn.textContent = remaining > 0 ? `Watching... (${remaining}s)` : 'Claiming reward...';
        if (remaining <= 0) { clearInterval(timer); grantAdReward(); }
    }, 1000);
}

function grantAdReward() {
    const formData = new FormData();
    formData.append('balance', currentBalance + 100);
    formData.append('points',  currentPoints);
    fetch('../PHP_Files/update-user-balance.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                currentBalance = parseFloat(data.balance);
                currentPoints  = parseInt(data.points);
                document.getElementById('userBalance').textContent = '₱ ' + currentBalance.toFixed(2);
                document.getElementById('userElo').textContent     = currentPoints;
                closeAdPopup();
                alert('🎉 You earned +100 ₱! Keep playing!');
            } else { alert('Could not apply reward. Please try again.'); }
        })
        .catch(() => alert('Network error. Please try again.'));
}

function closeAdPopup() {
    const overlay = document.getElementById('adPopupOverlay');
    if (overlay) overlay.remove();
}

// ─── RESET ────────────────────────────────────────────────────────────────────
function resetGame() {
    document.getElementById('betAmount').value = '';
    document.querySelectorAll('.game-buttons button').forEach(b => {
        b.classList.remove('active');
        b.style.backgroundColor = 'transparent';
        b.style.color           = 'aliceblue';
        b.style.fontWeight      = 'normal';
    });
    selectedButton        = null;
    selectedBettingOption = null;
    document.getElementById('dice1-image').src         = '../dice/1.png';
    document.getElementById('dice2-image').src         = '../dice/2.png';
    document.getElementById('dice1-value').textContent = '1';
    document.getElementById('dice2-value').textContent = '2';
    const modal = document.getElementById('resultModal');
    if (modal) modal.remove();
    isRolling = false;
    const submitButton = document.querySelector('#betForm input[type="submit"]');
    if (submitButton) { submitButton.disabled = false; submitButton.value = 'Submit'; }
}

// ─── DROPDOWN ─────────────────────────────────────────────────────────────────
function setupDropdownMenu() {
    const hamburgerIcon = document.getElementById('hamburgerIcon');
    const dropdownMenu  = document.getElementById('dropdownMenu');

    hamburgerIcon.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            handleDropdownItemClick(this.textContent.trim());
            dropdownMenu.classList.remove('active');
        });
    });

    document.addEventListener('click', function(e) {
        if (!hamburgerIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('active');
        }
    });
}

function handleDropdownItemClick(itemText) {
    switch (itemText) {
        case 'Tutorial':     openTutorialModal(); break;
        case 'Game History': openGameHistory();   break;
        case 'Probability':  openProbabilityModal(); break;
        case 'Logout':       handleLogout();      break;
    }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    fetch('../PHP_Files/logout.php', { method: 'POST', credentials: 'include' })
        .then(() => { window.location.href = 'index.html'; })
        .catch(() => { window.location.href = 'index.html'; });
}

// ─── TUTORIAL ─────────────────────────────────────────────────────────────────
function setupTutorialModal() {
    document.getElementById('closeModal').addEventListener('click', closeTutorialModal);
    document.getElementById('prevSlide').addEventListener('click', prevSlide);
    document.getElementById('nextSlide').addEventListener('click', nextSlide);
    document.querySelector('.tutorial-overlay').addEventListener('click', closeTutorialModal);
    document.querySelector('.tutorial-card').addEventListener('click', e => e.stopPropagation());
}

function openTutorialModal() {
    currentSlide = 1;
    updateSlideContent();
    document.getElementById('tutorialModal').classList.add('active');
}

function closeTutorialModal() { document.getElementById('tutorialModal').classList.remove('active'); }
function nextSlide() { if (currentSlide < totalSlides) { currentSlide++; updateSlideContent(); } }
function prevSlide() { if (currentSlide > 1)            { currentSlide--; updateSlideContent(); } }

function updateSlideContent() {
    document.getElementById('slideNumber').textContent = currentSlide;
    const content = document.querySelector('.tutorial-content');
    switch (currentSlide) {
        case 1: content.innerHTML = `<h1>Dice Game Tutorial</h1><ol><li>The player places a bet using Crystalline Points.</li><li>The player selects a Dice Pattern (sum from 2 to 12).</li><li>The system rolls two dice (values from 1 to 6).</li><li>The values are added to get the final result (2–12).</li><li>If the result matches the player's bet, they win based on the payout multiplier.</li><li>If not, the bet is lost.</li></ol>`; break;
        case 2: content.innerHTML = `<h1>Color Game Tutorial</h1><ol><li>The player places a bet using Crystalline Points.</li><li>The player selects a color (Red, Pink, Yellow, Blue, Green, or White).</li><li>The system rolls three color dice.</li><li>The results are revealed.</li><li>The player wins depending on how many dice match the selected color.</li></ol>`; break;
        case 3: content.innerHTML = `<h1>Roulette Game Tutorial</h1><ol><li>The player places a bet using Crystalline Points.</li><li>The player selects one betting pattern.</li><li>The game will select a random number from 1 to 30.</li><li>If the result matches the selected pattern, the player wins based on the payout rules.</li><li>If not, the player loses that Crystalline Points amount.</li></ol>`; break;
        default: content.innerHTML = `<p>Slide ${currentSlide} content goes here</p>`;
    }
    document.getElementById('prevSlide').disabled     = currentSlide === 1;
    document.getElementById('nextSlide').disabled     = currentSlide === totalSlides;
    document.getElementById('prevSlide').style.opacity = currentSlide === 1          ? '0.5' : '1';
    document.getElementById('nextSlide').style.opacity = currentSlide === totalSlides ? '0.5' : '1';
}

// ─── GAME HISTORY MODAL ───────────────────────────────────────────────────────
function setupGameHistoryModal() {
    const modal    = document.getElementById('gameHistoryModal');
    const closeBtn = modal.querySelector('.close-button');
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    // Probability modal close
    const probModal    = document.getElementById('probabilityModal');
    const probCloseBtn = document.getElementById('closeProbabilityModal');
    if (probCloseBtn) probCloseBtn.addEventListener('click', () => { probModal.style.display = 'none'; });
    probModal.addEventListener('click', function(e) {
        if (e.target === probModal) probModal.style.display = 'none';
    });
}

function openGameHistory() {
    const modal = document.getElementById('gameHistoryModal');
    modal.style.display = 'flex';
    loadDiceHistory();
}

function loadDiceHistory() {
    const tbody = document.querySelector('#gameHistoryModal table tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';

    fetch('../PHP_Files/get-game-history.php?game=dice', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            tbody.innerHTML = '';
            const rows = (data.history && data.history.dice) ? data.history.dice : [];
            if (rows.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No history yet.</td></tr>';
                return;
            }
            rows.forEach(row => {
                const tr   = document.createElement('tr');
                const date = new Date(row.date_played).toLocaleString();
                tr.innerHTML = `
                    <td style="color:${row.result==='WIN'?'#00ff99':'#ff6666'};font-weight:bold;">${row.result}</td>
                    <td style="text-align:center;font-size:18px;font-weight:bold;">${row.number}</td>
                    <td style="font-size:12px;color:#aaa;">${date}</td>`;
                tbody.appendChild(tr);
            });
        })
        .catch(() => {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#f66;">Failed to load history.</td></tr>';
        });
}
// ─── PROBABILITY MODAL ────────────────────────────────────────────────────────
const DICE_MULTIPLIERS = {2:30,3:15,4:10,5:8,6:6,7:5,8:6,9:8,10:10,11:15,12:30};

function openProbabilityModal() {
    const modal = document.getElementById('probabilityModal');
    modal.style.display = 'flex';
    loadDiceProbability();
}

function loadDiceProbability() {
    const tbody = document.getElementById('probabilityTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    fetch('../PHP_Files/get-probability.php?game=dice', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            tbody.innerHTML = '';
            if (!data.success) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f66;">Failed to load stats.</td></tr>';
                return;
            }
            const totalRounds = data.total_rounds;
            if (totalRounds === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;">No game history yet. Play some rounds first!</td></tr>';
                return;
            }

            // Find hottest sum
            let hottestSum = 2;
            for (let s = 2; s <= 12; s++) {
                if (data.stats[s].frequency > data.stats[hottestSum].frequency) hottestSum = s;
            }

            for (let sum = 2; sum <= 12; sum++) {
                const s   = data.stats[sum];
                const tr  = document.createElement('tr');
                const bar = buildDiceBar(s.frequency);
                const isHot  = sum === hottestSum;
                const label  = isHot ? ' <span style="font-size:11px;background:#f0c040;color:#000;border-radius:3px;padding:1px 4px;">HOT 🔥</span>' : '';
                // Theoretical probability of rolling this sum with 2d6
                const theoretical = theoreticalDiceProb(sum);
                tr.innerHTML = `
                    <td style="text-align:center;font-size:18px;font-weight:bold;">${sum}${label}</td>
                    <td style="text-align:center;">${s.times_rolled} / ${totalRounds}</td>
                    <td>${bar} ${s.frequency}% <span style="color:#666;font-size:11px;">(theory: ${theoretical}%)</span></td>
                    <td style="color:${s.win_rate >= 20 ? '#00ff99' : s.win_rate >= 10 ? '#f0c040' : '#ff6666'};font-weight:bold;">${s.win_rate}%</td>
                    <td style="text-align:center;color:#f0c040;">x${s.multiplier}</td>`;
                tbody.appendChild(tr);
            }

            const note = document.createElement('tr');
            note.innerHTML = `<td colspan="5" style="text-align:center;color:#888;font-size:12px;padding-top:10px;">Based on ${totalRounds} recorded round${totalRounds !== 1 ? 's' : ''}. Theory = expected % with fair dice.</td>`;
            tbody.appendChild(note);
        })
        .catch(() => {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f66;">Failed to load stats.</td></tr>';
        });
}

function theoreticalDiceProb(sum) {
    // Number of ways to roll a given sum with 2d6 (1–6 each)
    const ways = {2:1,3:2,4:3,5:4,6:5,7:6,8:5,9:4,10:3,11:2,12:1};
    return ((ways[sum] || 0) / 36 * 100).toFixed(1);
}

function buildDiceBar(pct) {
    const color = pct >= 20 ? '#00ff99' : pct >= 10 ? '#f0c040' : '#ff6666';
    return `<span style="display:inline-block;width:80px;background:#222;border-radius:3px;vertical-align:middle;margin-right:4px;height:8px;">` +
           `<span style="display:inline-block;width:${Math.min(pct * 3, 100)}%;background:${color};height:8px;border-radius:3px;"></span></span>`;
}