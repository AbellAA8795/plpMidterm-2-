let selectedBettingOption = null;
const wheel = document.getElementById('wheel') || null;
const resultDiv = document.getElementById('result') || null;
let isSpinning = false;
let currentBalance = 0;
let currentPoints  = 0;

// Tutorial Modal Variables
let currentSlide = 1;
const totalSlides = 3;

const API_URL = '../PHP_Files/roulette.php';

document.addEventListener('DOMContentLoaded', function() {
    syncBalanceFromServer();
    initializeWheel();
    setupBettingButtons();
    setupFormSubmission();
    setupDropdownMenu();
    setupTutorialModal();
    setupGameHistoryModal();
    setupNumberOnlyInput();
});

// ─── NUMBERS-ONLY INPUT ────────────────────────────────────────────────────────
function setupNumberOnlyInput() {
    const betInput = document.querySelector('.betting-input input[type="text"]');
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

// ─── WHEEL INIT ───────────────────────────────────────────────────────────────
function initializeWheel() {
    if (!wheel) return;
    wheel.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const angle  = (i - 1) * 12;
        const number = document.createElement('div');
        number.textContent = i;
        Object.assign(number.style, {
            position: 'absolute', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 'bold', color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
            transform: `rotate(${angle}deg) translateY(-170px)`
        });
        wheel.appendChild(number);
    }
}

// ─── BETTING BUTTONS ──────────────────────────────────────────────────────────
function setupBettingButtons() {
    const bettingButtons = document.querySelectorAll('.game-buttons button');
    bettingButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (isSpinning) return;
            bettingButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedBettingOption = this.textContent.trim();
        });
    });
}

function setupFormSubmission() {
    const form = document.querySelector('.betting-input form');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); confirmBet(); });
}

function confirmBet() {
    const betAmountInput = document.querySelector('.betting-input input[type="text"]');
    const betAmount = betAmountInput.value.trim();
    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) { alert('Please enter a valid bet amount!'); return; }
    if (!selectedBettingOption) { alert('Please select a betting option!'); return; }
    if (parseFloat(betAmount) > currentBalance) { alert('Insufficient balance! Your current balance is ₱' + currentBalance.toFixed(2)); return; }
    const confirmed = confirm(`Confirm Your Bet?\n\nBetting Option: ${selectedBettingOption}\nBet Amount: ₱${parseFloat(betAmount).toFixed(2)}`);
    if (confirmed) spinRoulette(betAmount);
}

// ─── SPIN ─────────────────────────────────────────────────────────────────────
function spinRoulette(betAmount) {
    isSpinning = true;
    if (resultDiv) resultDiv.innerHTML = '';
    const submitButton = document.querySelector('.betting-input input[type="submit"]');
    submitButton.disabled = true;
    submitButton.value    = 'Spinning...';

    const randomSpin   = Math.floor(Math.random() * 360);
    const totalRotation = 5 * 360 + randomSpin;
    if (wheel) { wheel.classList.add('spinning'); }

    setTimeout(() => {
        if (wheel) {
            wheel.classList.remove('spinning');
            wheel.style.transform = `rotate(${totalRotation}deg)`;
        }
        const landedNumber = calculateLandedNumber(totalRotation);
        sendBetToPhp(landedNumber, betAmount);
        isSpinning            = false;
        submitButton.disabled = false;
        submitButton.value    = 'Submit';
    }, 3000);
}

function calculateLandedNumber(rotation) {
    const normalizedRotation = rotation % 360;
    const initialAngle       = (360 - normalizedRotation) % 360;
    let landedNumber = Math.floor((initialAngle + 6) / 12) + 1;
    if (landedNumber > 30) landedNumber -= 30;
    return landedNumber;
}

function sendBetToPhp(landedNumber, betAmount) {
    const formData = new FormData();
    formData.append('betting_option', selectedBettingOption);
    formData.append('bet_amount',     betAmount);
    formData.append('landed_number',  landedNumber);

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

    const resultHTML = `
        <div id="resultModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:20px;background:rgba(0,0,0,0.9);border-radius:10px;text-align:center;color:white;min-width:320px;border:2px solid ${data.won ? '#00ff00' : '#ff4444'};">
            <h3 style="margin:0 0 15px 0;font-size:28px;">Result: ${data.randomNumber}</h3>
            <p style="margin:8px 0;"><strong>Your Bet:</strong> ${data.bettingOption}</p>
            <p style="margin:8px 0;"><strong>Bet Amount:</strong> ₱${parseFloat(data.betAmount).toFixed(2)}</p>
            <p style="margin:8px 0;"><strong>Status:</strong> ${data.won ? '✅ WON' : '❌ LOST'}</p>
            ${data.won ? `
                <p style="margin:8px 0;color:#00ff00;"><strong>Multiplier: x${data.multiplier}</strong></p>
                <p style="margin:8px 0;color:#00ff00;font-size:18px;"><strong>Won: +₱${parseFloat(data.winnings).toFixed(2)}</strong></p>
                <p style="margin:8px 0;color:#ffdd00;"><strong>Points Gained: +${data.pointsChange}</strong></p>
            ` : `
                <p style="margin:8px 0;color:#ff6666;font-size:18px;"><strong>Lost: -₱${parseFloat(data.betAmount).toFixed(2)}</strong></p>
                <p style="margin:8px 0;color:#ffcccc;"><strong>Points Lost: ${data.pointsChange}</strong></p>
            `}
            <p style="margin:12px 0;font-size:13px;color:#aaa;">Balance: ₱${currentBalance.toFixed(2)} | Points: ${currentPoints}</p>
            <p style="margin:10px 0;font-size:14px;">${data.message}</p>
            <button onclick="resetGame()" style="margin-top:15px;padding:10px 20px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:bold;">Play Again</button>
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
    const betAmountInput = document.querySelector('.betting-input input[type="text"]');
    if (betAmountInput) betAmountInput.value = '';
    if (wheel) wheel.style.transform = 'rotate(0deg)';
    document.querySelectorAll('.game-buttons button').forEach(btn => btn.classList.remove('active'));
    if (resultDiv) resultDiv.innerHTML = '';
    selectedBettingOption = null;
    const modal = document.getElementById('resultModal');
    if (modal) modal.remove();
    syncBalanceFromServer();
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
    currentSlide = 1; updateSlideContent();
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
    loadRouletteHistory();
}

function loadRouletteHistory() {
    const tbody = document.querySelector('#gameHistoryModal table tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';

    fetch('../PHP_Files/get-game-history.php?game=roulette', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            tbody.innerHTML = '';
            const rows = (data.history && data.history.roulette) ? data.history.roulette : [];
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
const ROULETTE_MULTIPLIERS = {
    'Low Bet': 2, 'High Bet': 2, 'Prime': 3, 'Odd': 2, 'Even': 2,
    'Peak': 30, 'Valley': 30, 'First Range': 2, 'Second Range': 2,
    'Third Range': 2, 'Luck 7': 15
};

function openProbabilityModal() {
    const modal = document.getElementById('probabilityModal');
    modal.style.display = 'flex';
    loadRouletteProbability();
}

function loadRouletteProbability() {
    const tbody = document.getElementById('probabilityTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    fetch('../PHP_Files/get-probability.php?game=roulette', { credentials: 'include' })
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

            // Sort by win_rate descending so best performers show first
            const entries = Object.entries(data.stats).sort((a, b) => b[1].win_rate - a[1].win_rate);

            entries.forEach(([option, s], idx) => {
                const tr      = document.createElement('tr');
                const bar     = buildRouletteBar(s.win_rate);
                const hotLabel  = idx === 0
                    ? ' <span style="font-size:11px;background:#f0c040;color:#000;border-radius:3px;padding:1px 4px;">HOT 🔥</span>'
                    : '';
                const coldLabel = idx === entries.length - 1
                    ? ' <span style="font-size:11px;background:#4488ff;color:#fff;border-radius:3px;padding:1px 4px;">COLD ❄️</span>'
                    : '';
                const winColor  = s.win_rate >= 50 ? '#00ff99' : s.win_rate >= 30 ? '#f0c040' : '#ff6666';
                tr.innerHTML = `
                    <td><strong>${option}</strong>${hotLabel}${coldLabel}</td>
                    <td style="text-align:center;color:#00ff99;">${s.wins}</td>
                    <td style="text-align:center;color:#ff6666;">${s.losses}</td>
                    <td>${bar} <span style="color:${winColor};font-weight:bold;">${s.win_rate}%</span></td>
                    <td style="text-align:center;color:#f0c040;">x${s.multiplier}</td>`;
                tbody.appendChild(tr);
            });

            const note = document.createElement('tr');
            note.innerHTML = `<td colspan="5" style="text-align:center;color:#888;font-size:12px;padding-top:10px;">Based on ${totalRounds} recorded round${totalRounds !== 1 ? 's' : ''}. Win rate = how often landed number matched that option.</td>`;
            tbody.appendChild(note);
        })
        .catch(() => {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f66;">Failed to load stats.</td></tr>';
        });
}

function buildRouletteBar(pct) {
    const color = pct >= 50 ? '#00ff99' : pct >= 30 ? '#f0c040' : '#ff6666';
    return `<span style="display:inline-block;width:90px;background:#222;border-radius:3px;vertical-align:middle;margin-right:4px;height:8px;">` +
           `<span style="display:inline-block;width:${Math.min(pct, 100)}%;background:${color};height:8px;border-radius:3px;"></span></span>`;
}