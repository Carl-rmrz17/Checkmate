// Multi-user authentication and task tracking
let currentUser = null;

let state = {
    tasks: [],
    graveyard: [],
    elo: 1200,
    capturedCount: 0
};

// Chess Quotes List
const quotes = [
    '"Every chess game is a new life." — Sergiu Samarian',
    '"Play the opening like a book, the middlegame like a magician, and the endgame like a machine." — Rudolf Spielmann',
    '"Chess is the struggle against the error." — Johannes Zukertort',
    '"I don\'t believe in psychology. I believe in good moves." — Bobby Fischer',
    '"The most powerful weapon in chess is to have the next move." — David Bronstein',
    '"Chess is a war over the board. The object is to crush the opponent\'s mind." — Bobby Fischer',
    '"Strategy requires thought, tactics requires observation." — Max Euwe'
];

// Piece unicode maps
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

// Web Audio API synth moves
function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (type === 'move') {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'checkmate') {
            const now = audioCtx.currentTime;
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, index) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + (index * 0.08));
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(0.15, now + (index * 0.08) + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + (index * 0.08) + 0.4);
                osc.start(now + (index * 0.08));
                osc.stop(now + (index * 0.08) + 0.4);
            });
        } else if (type === 'capture') {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }
    } catch (e) {
        console.warn("Web Audio not allowed or failed to start: ", e);
    }
}

// User registry and Authentication
function getUsersRegistry() {
    const registry = localStorage.getItem('checkmate_registry');
    return registry ? JSON.parse(registry) : {};
}

function saveUsersRegistry(registry) {
    localStorage.setItem('checkmate_registry', JSON.stringify(registry));
}

// Load current user profile tasks/state
function loadUserState() {
    if (!currentUser) return;
    const saved = localStorage.getItem(`checkmate_user_${currentUser}`);
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse saved state", e);
        }
    } else {
        // Reset to default for new users
        state = {
            tasks: [],
            graveyard: [],
            elo: 1200,
            capturedCount: 0
        };
    }
}

// Save current user state
function saveUserState() {
    if (!currentUser) return;
    localStorage.setItem(`checkmate_user_${currentUser}`, JSON.stringify(state));
}

// Display UI stats
function updateStats() {
    document.getElementById('elo-rating').innerText = state.elo;
    document.getElementById('stat-active').innerText = state.tasks.length;
    
    const completedCount = state.graveyard.length;
    document.getElementById('stat-completed').innerText = completedCount;
    document.getElementById('stat-captured').innerText = state.capturedCount;
    
    const totalFinished = completedCount + state.capturedCount;
    const winrate = totalFinished === 0 ? 100 : Math.round((completedCount / totalFinished) * 100);
    document.getElementById('stat-winrate').innerText = `${winrate}%`;
}

// Render the graveyard (completed tasks as pieces)
function renderGraveyard() {
    const container = document.getElementById('graveyard');
    container.innerHTML = '';
    
    state.graveyard.forEach(item => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.innerHTML = pieceIcons[item.priority] || '♙';
        span.title = `Completed: "${item.text}" (+${piecePoints[item.priority]} ELO)`;
        container.appendChild(span);
    });
}

// Render active tasks on the board
function renderTasks(filter = 'all') {
    const board = document.getElementById('tasks-board');
    const emptyState = document.getElementById('empty-state');
    board.innerHTML = '';
    
    const filteredTasks = state.tasks.filter(t => filter === 'all' || t.priority === filter);
    
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'flex';
        board.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    board.style.display = 'grid';
    
    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = `task-card ${task.priority}`;
        card.id = `task-${task.id}`;
        
        card.innerHTML = `
            <div class="task-header">
                <div class="task-piece-indicator">${pieceIcons[task.priority]}</div>
                <div class="task-date">${new Date(task.created).toLocaleDateString()}</div>
            </div>
            <div class="task-text">${escapeHTML(task.text)}</div>
            <div class="task-actions">
                <button class="action-btn checkmate-btn" onclick="checkmateTask(${task.id})">
                    Checkmate
                </button>
                <button class="action-btn capture-btn" onclick="captureTask(${task.id})">
                    Capture
                </button>
            </div>
        `;
        
        board.appendChild(card);
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

// Add a new task
function handleAddTask(e) {
    e.preventDefault();
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) return;
    
    const priority = document.querySelector('input[name="priority"]:checked').value;
    
    const newTask = {
        id: Date.now(),
        text,
        priority,
        created: Date.now()
    };
    
    state.tasks.push(newTask);
    playSound('move');
    input.value = '';
    
    // Cycle quote
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('chess-quote').innerText = randomQuote;
    
    saveUserState();
    updateStats();
    renderTasks();
}

// Complete task (Checkmate)
window.checkmateTask = function(id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const task = state.tasks[taskIndex];
    state.tasks.splice(taskIndex, 1);
    
    state.graveyard.push(task);
    state.elo += piecePoints[task.priority] || 10;
    
    playSound('checkmate');
    
    saveUserState();
    updateStats();
    renderTasks();
    renderGraveyard();
};

// Delete/Cancel task (Capture)
window.captureTask = function(id) {
    const taskIndex = state.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;
    
    const task = state.tasks[taskIndex];
    state.tasks.splice(taskIndex, 1);
    state.capturedCount += 1;
    
    state.elo = Math.max(100, state.elo - Math.round(piecePoints[task.priority] / 2));
    
    playSound('capture');
    
    saveUserState();
    updateStats();
    renderTasks();
};

// Filter tasks
function handleFilter(e) {
    if (!e.target.classList.contains('filter-btn')) return;
    
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    const filter = e.target.getAttribute('data-filter');
    renderTasks(filter);
}

// Navigation & Auth Flow
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
        renderGraveyard();
    } else {
        localStorage.removeItem('checkmate_current_user');
        document.getElementById('auth-overlay').classList.remove('hidden');
        document.getElementById('app-container').classList.add('authenticated-only');
    }
}

// Register Submission
function handleRegister(e) {
    e.preventDefault();
    const errorMsg = document.getElementById('register-error');
    const successMsg = document.getElementById('register-success');
    errorMsg.innerText = '';
    successMsg.innerText = '';
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (username.length < 3) {
        errorMsg.innerText = 'Username must be at least 3 characters.';
        return;
    }
    if (password.length < 4) {
        errorMsg.innerText = 'Password must be at least 4 characters.';
        return;
    }
    
    const registry = getUsersRegistry();
    if (registry[username.toLowerCase()]) {
        errorMsg.innerText = 'Contender username already exists.';
        return;
    }
    
    // Register player
    registry[username.toLowerCase()] = {
        username: username,
        password: password // In mock local storage, storing plain text is fine
    };
    saveUsersRegistry(registry);
    
    successMsg.innerText = 'League profile created! Redirecting to Sign In...';
    setTimeout(() => {
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('login-form').classList.add('active');
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = '';
        successMsg.innerText = '';
        errorMsg.innerText = '';
    }, 1200);
}

// Login Submission
function handleLogin(e) {
    e.preventDefault();
    const errorMsg = document.getElementById('login-error');
    errorMsg.innerText = '';
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    const registry = getUsersRegistry();
    const userRecord = registry[username.toLowerCase()];
    
    if (!userRecord || userRecord.password !== password) {
        errorMsg.innerText = 'Invalid username or credentials.';
        return;
    }
    
    playSound('move');
    setAuthenticationState(userRecord.username);
}

// Logout / Resign
function handleLogout() {
    playSound('capture');
    setAuthenticationState(null);
    // Reset fields
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
}

// Init Setup
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners
    document.getElementById('todo-form').addEventListener('submit', handleAddTask);
    document.querySelector('.filter-buttons').addEventListener('click', handleFilter);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Form toggle links
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
    
    // Check auto login
    const autoUser = localStorage.getItem('checkmate_current_user');
    if (autoUser) {
        setAuthenticationState(autoUser);
    } else {
        setAuthenticationState(null);
    }
});
