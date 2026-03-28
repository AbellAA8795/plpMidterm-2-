let selectedBettingOption = null;
let selectedButton = null;
let isRolling = false;
let currentBalance = 0;
let currentPoints = 0;

const COLORS = ['red', 'pink', 'yellow', 'blue', 'green', 'white'];

// Tutorial Modal Variables
let currentSlide = 1;
const totalSlides = 3;

const colorMap = {
    'red': '#FF0000',
    'pink': '#FFC0CB',
    'yellow': '#FFFF00',
    'blue': '#0000FF',
    'green': '#008000',
    'white': '#FFFFFF'
};

const API_URL = '../PHP_Files/color-match.php';

document.addEventListener('DOMContentLoaded', function() {
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
        // Strip anything that isn't a digit or a single decimal point
        this.value = this.value.replace(/[^0-9.]/g, '');
        // Prevent more than one decimal point
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
                document.getElementById('userBalance').textContent = 'CP ' + currentBalance.toFixed(2);
                document.getElementById('userElo').textContent     = currentPoints;
            }
        })
        .catch(error => console.error('Failed to sync balance:', error));
}

// ─── BETTING BUTTONS ──────────────────────────────────────────────────────────
function setupBettingButtons() {
    const buttons = document.querySelectorAll('.game-button');
    buttons.forEach((button) => {
        button.addEventListener('click', function() {
            if (isRolling) return;
            if (selectedButton) {
                selectedButton.style.transform  = 'scale(1)';
                selectedButton.style.boxShadow  = 'none';
                selectedButton.style.border     = 'none';
            }
            this.style.transform  = 'scale(1.05)';
            this.style.boxShadow  = '0 0 20px rgba(255,255,255,0.8), inset 0 0 20px rgba(255,255,255,0.3)';
            this.style.border     = '3px solid white';
            selectedButton        = this;
            selectedBettingOption = this.getAttribute('data-color');
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

    if (!betAmount || isNaN(betAmount) || parseFloat(betAmount) <= 0) {
        alert('Please enter a valid bet amount!'); return;
    }
    if (!selectedBettingOption) {
        alert('Please select a betting option (color)!'); return;
    }
    const betAmountNum = parseFloat(betAmount);
    if (betAmountNum > currentBalance) {
        alert('Insufficient balance! Your current balance is CP ' + currentBalance.toFixed(2)); return;
    }
    const confirmed = confirm(`Confirm Your Bet?\n\nBetting Option: ${selectedBettingOption.toUpperCase()}\nBet Amount: CP ${betAmountNum.toFixed(2)}`);
    if (confirmed) rollColors(betAmount);
}

// ─── ROLL ─────────────────────────────────────────────────────────────────────
function rollColors(betAmount) {
    isRolling = true;
    const submitButton = document.querySelector('#betForm input[type="submit"]');
    submitButton.disabled = true;
    submitButton.value    = 'Rolling...';

    const colorAnimationDuration = 2000;
    const animationInterval      = 50;
    let elapsedTime = 0;

    const animationTimer = setInterval(() => {
        updateColorDisplay(
            COLORS[Math.floor(Math.random() * COLORS.length)],
            COLORS[Math.floor(Math.random() * COLORS.length)],
            COLORS[Math.floor(Math.random() * COLORS.length)]
        );
        elapsedTime += animationInterval;
        if (elapsedTime >= colorAnimationDuration) {
            clearInterval(animationTimer);
            const f1 = COLORS[Math.floor(Math.random() * COLORS.length)];
            const f2 = COLORS[Math.floor(Math.random() * COLORS.length)];
            const f3 = COLORS[Math.floor(Math.random() * COLORS.length)];
            updateColorDisplay(f1, f2, f3);
            sendBetToPhp(f1, f2, f3, betAmount);
            isRolling              = false;
            submitButton.disabled  = false;
            submitButton.value     = 'Submit';
        }
    }, animationInterval);
}

function updateColorDisplay(c1, c2, c3) {
    document.getElementById('color1').style.backgroundColor = colorMap[c1];
    document.getElementById('color2').style.backgroundColor = colorMap[c2];
    document.getElementById('color3').style.backgroundColor = colorMap[c3];
}

function sendBetToPhp(color1, color2, color3, betAmount) {
    const formData = new FormData();
    formData.append('betting_option', selectedBettingOption);
    formData.append('bet_amount',     betAmount);
    formData.append('color1',         color1);
    formData.append('color2',         color2);
    formData.append('color3',         color3);

    fetch(API_URL, { method: 'POST', body: formData })
        .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.text(); })
        .then(text => { if (!text) throw new Error('Empty response'); displayResult(JSON.parse(text)); })
        .catch(error => { alert('An error occurred: ' + error.message); console.error(error); });
}

// ─── DISPLAY RESULT + ZERO-BALANCE AD POPUP ───────────────────────────────────
function displayResult(data) {
    if (data.newBalance !== undefined && !isNaN(parseFloat(data.newBalance))) {
        currentBalance = parseFloat(data.newBalance);
    }
    if (data.newPoints !== undefined && !isNaN(parseInt(data.newPoints))) {
        currentPoints = parseInt(data.newPoints);
    }

    document.getElementById('userBalance').textContent = 'CP ' + currentBalance.toFixed(2);
    document.getElementById('userElo').textContent     = currentPoints;
    document.getElementById('betAmount').value         = '';

    if (selectedButton) {
        selectedButton.style.transform = 'scale(1)';
        selectedButton.style.boxShadow = 'none';
        selectedButton.style.border    = 'none';
        selectedButton = null;
    }
    selectedBettingOption = null;

    const bettingOption = (data.bettingOption || 'unknown').toUpperCase();
    const color1  = data.color1 || 'unknown';
    const color2  = data.color2 || 'unknown';
    const color3  = data.color3 || 'unknown';
    const matches = parseInt(data.matches) || 0;
    const won     = data.won === true || data.won === 1;
    const betAmt  = parseFloat(data.betAmount) || 0;
    const winnings   = parseFloat(data.winnings) || 0;
    const multiplier = parseInt(data.multiplier) || 0;
    const eloChange  = parseInt(data.pointsChange) || 0;

    const resultHTML = `
        <div id="resultModal" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;padding:30px;background:rgba(0,0,0,0.95);border-radius:10px;text-align:center;color:white;min-width:380px;border:3px solid ${won ? '#00ff00' : '#ff0000'};font-family:'Inter',sans-serif;">
            <h3 style="margin:0 0 10px 0;font-size:24px;">🎨 Colors Result</h3>
            <p style="margin:5px 0;font-size:16px;"><strong>Your Bet:</strong> ${bettingOption}</p>
            <p style="margin:5px 0;font-size:16px;"><strong>Bet Amount:</strong> CP${betAmt.toFixed(2)}</p>
            <p style="margin:10px 0;font-size:16px;"><strong>Colors:</strong>
                <span style="color:${colorMap[color1]||'#888'};font-weight:bold;">${color1}</span> |
                <span style="color:${colorMap[color2]||'#888'};font-weight:bold;">${color2}</span> |
                <span style="color:${colorMap[color3]||'#888'};font-weight:bold;">${color3}</span>
            </p>
            <p style="margin:15px 0;font-size:16px;"><strong>Matches: ${matches}/3</strong></p>
            <p style="margin:10px 0;font-size:20px;font-weight:bold;color:${won ? '#00ff00' : '#ff0000'};">${won ? '✅ WON' : '❌ LOST'}</p>
            ${won ? `
                <p style="margin:5px 0;color:#00ff00;font-size:16px;"><strong>Multiplier: x${multiplier}</strong></p>
                <p style="margin:5px 0;color:#00ff00;font-size:18px;"><strong>Winnings: CP${winnings.toFixed(2)}</strong></p>
                <p style="margin:5px 0;color:#ffff00;font-size:16px;"><strong>ELO Gained: +${eloChange}</strong></p>
            ` : `
                <p style="margin:5px 0;color:#ff6666;font-size:18px;"><strong>Loss: -CP${betAmt.toFixed(2)}</strong></p>
                <p style="margin:5px 0;color:#ff6666;font-size:16px;"><strong>ELO Lost: -${Math.abs(eloChange)}</strong></p>
            `}
            <p style="margin:15px 0 5px 0;border-top:1px solid #666;padding-top:10px;font-size:16px;"><strong>New Balance:</strong> CP${currentBalance.toFixed(2)}</p>
            <p style="margin:5px 0;font-size:16px;"><strong>ELO Ranking:</strong> ${currentPoints}</p>
            <button onclick="resetGame()" style="margin-top:15px;padding:10px 20px;background:#007bff;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:bold;">Play Again</button>
        </div>`;

    const existing = document.getElementById('resultModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', resultHTML);

    // Show ad popup if balance hit zero
    if (currentBalance <= 0) {
        setTimeout(showAdPopup, 400);
    }
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
            <p style="color:#ccc;font-size:15px;margin:0 0 24px 0;">Watch a short ad to receive <strong style="color:#00ff99;">+100 CP</strong> and keep playing!</p>
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

    // Simulate a 5-second ad
    let remaining = 5;
    if (btn) btn.textContent = `Watching... (${remaining}s)`;
    const timer = setInterval(() => {
        remaining--;
        if (btn) btn.textContent = remaining > 0 ? `Watching... (${remaining}s)` : 'Claiming reward...';
        if (remaining <= 0) {
            clearInterval(timer);
            grantAdReward();
        }
    }, 1000);
}

function grantAdReward() {
    // Add +100 to balance via the update endpoint
    const formData = new FormData();
    const newBal   = currentBalance + 100;
    const newPts   = currentPoints;
    formData.append('balance', newBal);
    formData.append('points',  newPts);

    fetch('../PHP_Files/update-user-balance.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                currentBalance = parseFloat(data.balance);
                currentPoints  = parseInt(data.points);
                document.getElementById('userBalance').textContent = 'CP ' + currentBalance.toFixed(2);
                document.getElementById('userElo').textContent     = currentPoints;
                closeAdPopup();
                alert('🎉 You earned +100 CP! Keep playing!');
            } else {
                alert('Could not apply reward. Please try again.');
            }
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
    document.querySelectorAll('.game-button').forEach(b => {
        b.style.transform = 'scale(1)'; b.style.boxShadow = 'none'; b.style.border = 'none';
    });
    selectedButton        = null;
    selectedBettingOption = null;
    document.getElementById('color1').style.backgroundColor = '#888';
    document.getElementById('color2').style.backgroundColor = '#888';
    document.getElementById('color3').style.backgroundColor = '#888';
    const modal = document.getElementById('resultModal');
    if (modal) modal.remove();
}

// ─── DROPDOWN MENU ────────────────────────────────────────────────────────────
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
        case 'Tutorial':     openTutorialModal();    break;
        case 'Game History': openGameHistory();       break;
        case 'Probability':  openProbabilityModal();  break;
        case 'Logout':       handleLogout();          break;
    }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    fetch('../PHP_Files/logout.php', { method: 'POST', credentials: 'include' })
        .then(() => { window.location.href = 'index.html'; })
        .catch(() => { window.location.href = 'index.html'; });
}

// ─── TUTORIAL MODAL ───────────────────────────────────────────────────────────
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

function closeTutorialModal() {
    document.getElementById('tutorialModal').classList.remove('active');
}

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
    document.getElementById('prevSlide').disabled = currentSlide === 1;
    document.getElementById('nextSlide').disabled = currentSlide === totalSlides;
    document.getElementById('prevSlide').style.opacity = currentSlide === 1          ? '0.5' : '1';
    document.getElementById('nextSlide').style.opacity = currentSlide === totalSlides ? '0.5' : '1';
}

// ─── GAME HISTORY MODAL ───────────────────────────────────────────────────────
function setupGameHistoryModal() {
    const modal     = document.getElementById('gameHistoryModal');
    const closeBtn  = modal.querySelector('.close-button');
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    // Probability modal close
    const probModal   = document.getElementById('probabilityModal');
    const probCloseBtn = document.getElementById('closeProbabilityModal');
    if (probCloseBtn) probCloseBtn.addEventListener('click', () => { probModal.style.display = 'none'; });
    // Close on backdrop click
    probModal.addEventListener('click', function(e) {
        if (e.target === probModal) probModal.style.display = 'none';
    });
}

function openGameHistory() {
    const modal = document.getElementById('gameHistoryModal');
    modal.style.display = 'flex';
    loadColorHistory();
}

function loadColorHistory() {
    const tbody = document.querySelector('#gameHistoryModal table tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    fetch('../PHP_Files/get-game-history.php?game=colorgame', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            tbody.innerHTML = '';
            const rows = (data.history && data.history.colorgame) ? data.history.colorgame : [];
            if (rows.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No history yet.</td></tr>';
                return;
            }
            rows.forEach(row => {
                const tr = document.createElement('tr');
                const date = new Date(row.date_played).toLocaleString();
                tr.innerHTML = `
                    <td style="color:${row.result==='WIN'?'#00ff99':'#ff6666'};font-weight:bold;">${row.result}</td>
                    <td><span style="display:inline-block;width:14px;height:14px;background:${colorMap[row.color1]||'#888'};border:1px solid #fff;border-radius:3px;vertical-align:middle;margin-right:4px;"></span>${row.color1}</td>
                    <td><span style="display:inline-block;width:14px;height:14px;background:${colorMap[row.color2]||'#888'};border:1px solid #fff;border-radius:3px;vertical-align:middle;margin-right:4px;"></span>${row.color2}</td>
                    <td><span style="display:inline-block;width:14px;height:14px;background:${colorMap[row.color3]||'#888'};border:1px solid #fff;border-radius:3px;vertical-align:middle;margin-right:4px;"></span>${row.color3}</td>
                    <td style="font-size:12px;color:#aaa;">${date}</td>`;
                tbody.appendChild(tr);
            });
        })
        .catch(() => {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#f66;">Failed to load history.</td></tr>';
        });
}
// ─── PROBABILITY MODAL ────────────────────────────────────────────────────────
const colorMap_display = {
    red: '#FF4444', pink: '#FF90B3', yellow: '#FFE000',
    blue: '#4488FF', green: '#44CC66', white: '#FFFFFF'
};

function openProbabilityModal() {
    const modal = document.getElementById('probabilityModal');
    modal.style.display = 'flex';
    loadColorProbability();
}

function loadColorProbability() {
    const tbody = document.getElementById('probabilityTableBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';

    fetch('../PHP_Files/get-probability.php?game=colorgame', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
            tbody.innerHTML = '';
            if (!data.success) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#f66;">Failed to load stats.</td></tr>';
                return;
            }
            const totalRounds = data.total_rounds;
            if (totalRounds === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;">No game history yet. Play some rounds first!</td></tr>';
                return;
            }

            const colors = ['red', 'pink', 'yellow', 'blue', 'green', 'white'];
            // Sort by win rate descending
            colors.sort((a, b) => data.stats[b].win_rate - data.stats[a].win_rate);

            colors.forEach((color, idx) => {
                const s   = data.stats[color];
                const tr  = document.createElement('tr');
                const bar = buildBar(s.win_rate);
                const hotLabel = idx === 0 ? ' <span style="font-size:11px;background:#f0c040;color:#000;border-radius:3px;padding:1px 4px;margin-left:4px;">HOT 🔥</span>' : '';
                const coldLabel = idx === colors.length - 1 ? ' <span style="font-size:11px;background:#4488ff;color:#fff;border-radius:3px;padding:1px 4px;margin-left:4px;">COLD ❄️</span>' : '';
                tr.innerHTML = `
                    <td>
                        <span style="display:inline-block;width:14px;height:14px;background:${colorMap_display[color]};border:1px solid #fff;border-radius:3px;vertical-align:middle;margin-right:6px;"></span>
                        <strong>${capitalize(color)}</strong>${hotLabel}${coldLabel}
                    </td>
                    <td style="text-align:center;">${s.appeared} / ${totalRounds}</td>
                    <td>${bar} ${s.appear_rate}%</td>
                    <td style="color:${s.win_rate >= 50 ? '#00ff99' : s.win_rate >= 30 ? '#f0c040' : '#ff6666'};font-weight:bold;">${s.win_rate}%</td>`;
                tbody.appendChild(tr);
            });

            // Summary row
            const note = document.createElement('tr');
            note.innerHTML = `<td colspan="4" style="text-align:center;color:#888;font-size:12px;padding-top:10px;">Based on ${totalRounds} recorded round${totalRounds !== 1 ? 's' : ''}. Win rate = rounds where ≥1 die matched.</td>`;
            tbody.appendChild(note);
        })
        .catch(() => {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#f66;">Failed to load stats.</td></tr>';
        });
}

function buildBar(pct) {
    const filled = Math.round(pct / 5);  // 20 segments max
    const color  = pct >= 50 ? '#00ff99' : pct >= 30 ? '#f0c040' : '#ff6666';
    return `<span style="display:inline-block;width:100px;background:#222;border-radius:3px;vertical-align:middle;margin-right:4px;height:8px;">` +
           `<span style="display:inline-block;width:${Math.min(pct, 100)}%;background:${color};height:8px;border-radius:3px;"></span></span>`;
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }