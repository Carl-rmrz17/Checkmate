// Multi-user authentication and task tracking - Grandmaster Edition
let currentUser = null;

let state = {
    tasks: [],
    graveyard: [],
    elo: 1200,
    capturedCount: 0,
    theme: 'obsidian'
};

const quotes = [
    '"Every chess game is a new life." — Sergiu Samarian',
    '"Play the opening like a book, the middlegame like a magician, and the endgame like a machine." — Rudolf Spielmann',
    '"Chess is the struggle against the error." — Johannes Zukertort',
    '"I don\'t believe in psychology. I believe in good moves." — Bobby Fischer',
    '"The most powerful weapon in chess is to have the next move." — David Bronstein',
    '"Chess is a war over the board. The object is to crush the opponent\'s mind." — Bobby Fischer'
];

const pieceIcons = {
    pawn: '♙',
    knight: '♘',
    rook: '♖',
    king: '♔'
};

const piecePoints = {
    pawn: 10,
    knight: 20,
    rook: 35,
    king: 50
};

// Map files and ranks
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

// Synthesis move sound effects
function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (type === 'move') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'checkmate') {
            const now = audioCtx.currentTime;
            const chord = [261.63, 329.63, 392.00, 523.25];
            chord.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + (idx * 0.07));
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.12, now + (idx * 0.07) + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.01, now + (idx * 0.07) + 0.45);
                osc.start(now + (idx * 0.07));
                osc.stop(now + (idx * 0.07) + 0.45);
            });
        } else if (type === 'capture') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        }
    } catch (e) {
        console.warn("Audio context blocked or disabled", e);
    }
}

// User Profile Registry
function getUsersRegistry() {
    const registry = localStorage.getItem('checkmate_registry');
    return registry ? JSON.parse(registry) : {};
}

function saveUsersRegistry(registry) {
    localStorage.setItem('checkmate_registry', JSON.stringify(registry));
}

// Load / Save States
function loadUserState() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`checkmate_user_${currentUser}`);
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (!state.theme) state.theme = 'obsidian';
        } catch (e) {
            console.error("Failed to load user state", e);
        }
    } else {
        state = {
            tasks: [],
            graveyard: [],
            elo: 1200,
            capturedCount: 0,
            theme: 'obsidian'
        };
    }
    applyTheme(state.theme);
}

function saveUserState() {
    if (!currentUser) return;
    localStorage.setItem(`checkmate_user_${currentUser}`, JSON.stringify(state));
}

function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    document.getElementById('theme-select').value = themeName;
    state.theme = themeName;
}

// Dynamic ELO Ranking Titles
function getTitle(elo) {
    if (elo < 1200) return 'Contender';
    if (elo < 1500) return 'Club Player';
    if (elo < 1800) return 'Candidate Master';
    if (elo < 2000) return 'FIDE Master';
    if (elo < 2200) return 'International Master';
    return 'Grandmaster';
}

function updateStats() {
    document.getElementById('elo-rating').innerText = state.elo;
    document.getElementById('player-title').innerText = getTitle(state.elo);
    document.getElementById('stat-active').innerText = state.tasks.length;
    
    const completedCount = state.graveyard.length;
    document.getElementById('stat-completed').innerText = completedCount;
    document.getElementById('stat-captured').innerText = state.capturedCount;
    
    const totalFinished = completedCount + state.capturedCount;
    const winrate = totalFinished === 0 ? 100 : Math.round((completedCount / totalFinished) * 100);
    document.getElementById('stat-winrate').innerText = `${winrate}%`;
}

function renderGraveyard() {
    const container = document.getElementById('graveyard');
    container.innerHTML = '';
    state.graveyard.forEach(item => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.innerHTML = pieceIcons[item.priority] || '♙';
        span.title = `Checkmated: "${item.text}" (+${piecePoints[item.priority]} ELO)`;
        container.appendChild(span);
    });
}

// Visual 8x8 Chessboard builder
function renderChessboard() {
    const board = document.getElementById('chess-board');
    board.innerHTML = '';
    
    // Create coordinate mapping for easy lookup
    const pieceMap = {};
    state.tasks.forEach(t => {
        if (t.boardPos) {
            pieceMap[t.boardPos] = t;
        }
    });
    
    // 8 ranks, 8 files
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const squareName = files[f] + ranks[r];
            const square = document.createElement('div');
            square.className = `board-square ${(r + f) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.coord = squareName;
            
            const task = pieceMap[squareName];
            if (task) {
                const piece = document.createElement('span');
                piece.className = 'board-piece';
                piece.innerHTML = pieceIcons[task.priority];
                piece.title = `[${task.priority.toUpperCase()}] ${task.text}`;
                square.appendChild(piece);
                
                // Clicking square highlights the task card
                square.addEventListener('click', () => {
                    highlightTaskCard(task.id);
                });
            }
            
            board.appendChild(square);
        }
    }
}

// Find a random free board square depending on progress phase
// Opening: ranks 1-3. Middlegame: ranks 4-5. Endgame: ranks 6-8.
function getAvailableSquare(phase) {
    let allowedRanks = [1, 2, 3];
    if (phase === 'middlegame') allowedRanks = [4, 5];
    if (phase === 'endgame') allowedRanks = [6, 7, 8];
    
    const activePositions = state.tasks.map(t => t.boardPos);
    
    // Try to find a free square
    let attempts = 0;
    while (attempts < 100) {
        const randFile = files[Math.floor(Math.random() * 8)];
        const randRank = allowedRanks[Math.floor(Math.random() * allowedRanks.length)];
        const candidate = randFile + randRank;
        
        if (!activePositions.includes(candidate)) {
            return candidate;
        }
        attempts++;
    }
    
    // Fallback: search exhaustively
    for (let rank of allowedRanks) {
        for (let file of files) {
            const pos = file + rank;
            if (!activePositions.includes(pos)) return pos;
        }
    }
    return 'e2'; // absolute fallback
}

// Highlight task card
function highlightTaskCard(id) {
    // Remove previous highlights
    document.querySelectorAll('.task-card').forEach(c => c.style.boxShadow = '');
    document.querySelectorAll('.board-square').forEach(s => s.classList.remove('highlighted'));
    
    const card = document.getElementById(`task-${id}`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        card.style.boxShadow = '0 0 15px var(--gold)';
        
        const task = state.tasks.find(t => t.id === id);
        if (task && task.boardPos) {
            const square = document.querySelector(`[data-coord="${task.boardPos}"]`);
            if (square) square.classList.add('highlighted');
        }
    }
}

// Render Kanban phases
function renderTasks() {
    const phases = ['opening', 'middlegame', 'endgame'];
    
    phases.forEach(phase => {
        const column = document.getElementById(`tasks-${phase}`);
        const badge = document.getElementById(`badge-${phase}`);
        column.innerHTML = '';
        
        const phaseTasks = state.tasks.filter(t => t.phase === phase);
        badge.innerText = phaseTasks.length;
        
        phaseTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card ${task.priority}`;
            card.id = `task-${task.id}`;
            
            card.innerHTML = `
                <div class="task-header">
                    <span class="task-piece-indicator">${pieceIcons[task.priority]}</span>
                    <span class="task-board-pos">${task.boardPos.toUpperCase()}</span>
                </div>
                <div class="task-text">${escapeHTML(task.text)}</div>
                <div class="task-actions">
                    <div class="phase-nav-btns">
                        ${phase !== 'opening' ? `<button class="nav-btn" onclick="moveTaskPhase(${task.id}, 'prev')">←</button>` : ''}
                        ${phase !== 'endgame' ? `<button class="nav-btn" onclick="moveTaskPhase(${task.id}, 'next')">→</button>` : ''}
                    </div>
                    <div class="action-row">
                        <button class="action-btn checkmate-btn" onclick="checkmateTask(${task.id})">Checkmate</button>
                        <button class="action-btn capture-btn" onclick="captureTask(${task.id})">Capture</button>
                    </div>
                </div>
            `;
            
            // Add click listener to highlight corresponding square on board
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // ignore actions
                highlightTaskCard(task.id);
            });
            
            column.appendChild(card);
        });
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Add Move (Task)
function handleAddTask(e) {
    e.preventDefault();
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) return;
    
    const priority = document.querySelector('input[name="priority"]:checked').value;
    const boardPos = getAvailableSquare('opening');
    
    const newTask = {
        id: Date.now(),
        text,
        priority,
        phase: 'opening',
        boardPos,
        created: Date.now()
    };
    
    state.tasks.push(newTask);
    playSound('move');
    input.value = '';
    
    // Cycle chess quotes
    document.getElementById('chess-quote').innerText = quotes[Math.floor(Math.random() * quotes.length)];
    
    saveUserState();
    updateStats();
    renderTasks();
    renderChessboard();
}

// Move task phase (Move piece across the board ranks)
window.moveTaskPhase = function(id, direction) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    
    const phaseOrder = ['opening', 'middlegame', 'endgame'];
    const currentIdx = phaseOrder.indexOf(task.phase);
    
    let newIdx = currentIdx;
    if (direction === 'next' && currentIdx < 2) newIdx++;
    if (direction === 'prev' && currentIdx > 0) newIdx--;
    
    if (newIdx !== currentIdx) {
        task.phase = phaseOrder[newIdx];
        // Relocate piece to a matching rank coordinate
        task.boardPos = getAvailableSquare(task.phase);
        
        playSound('move');
        saveUserState();
        renderTasks();
        renderChessboard();
        highlightTaskCard(task.id);
    }
};

// Checkmate task
window.checkmateTask = function(id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const task = state.tasks[idx];
    state.tasks.splice(idx, 1);
    state.graveyard.push(task);
    
    state.elo += piecePoints[task.priority];
    
    playSound('checkmate');
    saveUserState();
    updateStats();
    renderTasks();
    renderChessboard();
    renderGraveyard();
};

// Capture task
window.captureTask = function(id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    
    const task = state.tasks[idx];
    state.tasks.splice(idx, 1);
    state.capturedCount++;
    
    state.elo = Math.max(100, state.elo - Math.round(piecePoints[task.priority] / 2));
    
    playSound('capture');
    saveUserState();
    updateStats();
    renderTasks();
    renderChessboard();
};

// Authentication state controller
function setAuthenticationState(username) {
    currentUser = username;
    if (username) {
        localStorage.setItem('checkmate_current_user', username);
        loadUserState();
        document.getElementById('display-username').innerText = username;
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('app-container').classList.remove('authenticated-only');
        
        updateStats();
        renderTasks();
        renderChessboard();
        renderGraveyard();
    } else {
        localStorage.removeItem('checkmate_current_user');
        document.getElementById('auth-overlay').classList.remove('hidden');
        document.getElementById('app-container').classList.add('authenticated-only');
    }
}

// Forms Logic
function handleLogin(e) {
    e.preventDefault();
    const errorMsg = document.getElementById('login-error');
    errorMsg.innerText = '';
    
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    
    const registry = getUsersRegistry();
    const record = registry[u.toLowerCase()];
    
    if (!record || record.password !== p) {
        errorMsg.innerText = 'Invalid username or credentials.';
        return;
    }
    
    playSound('move');
    setAuthenticationState(record.username);
}

function handleRegister(e) {
    e.preventDefault();
    const errorMsg = document.getElementById('register-error');
    const successMsg = document.getElementById('register-success');
    errorMsg.innerText = '';
    successMsg.innerText = '';
    
    const u = document.getElementById('register-username').value.trim();
    const p = document.getElementById('register-password').value;
    
    if (u.length < 3) {
        errorMsg.innerText = 'Username must be at least 3 characters.';
        return;
    }
    if (p.length < 4) {
        errorMsg.innerText = 'Password must be at least 4 characters.';
        return;
    }
    
    const registry = getUsersRegistry();
    if (registry[u.toLowerCase()]) {
        errorMsg.innerText = 'Username already registered.';
        return;
    }
    
    registry[u.toLowerCase()] = { username: u, password: p };
    saveUsersRegistry(registry);
    
    successMsg.innerText = 'Contender profile created! Redirecting to Sign In...';
    setTimeout(() => {
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
        document.getElementById('login-username').value = u;
        document.getElementById('login-password').value = '';
        successMsg.innerText = '';
    }, 1200);
}

function handleLogout() {
    playSound('capture');
    setAuthenticationState(null);
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
}

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('todo-form').addEventListener('submit', handleAddTask);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Theme selection listener
    document.getElementById('theme-select').addEventListener('change', (e) => {
        applyTheme(e.target.value);
        saveUserState();
    });
    
    // Switch auth forms
    document.getElementById('to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.add('active');
    });
    
    document.getElementById('to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
    });
    
    const autoUser = localStorage.getItem('checkmate_current_user');
    if (autoUser) {
        setAuthenticationState(autoUser);
    } else {
        setAuthenticationState(null);
    }
});
