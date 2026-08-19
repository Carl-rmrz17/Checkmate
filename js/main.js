import { supabase, signInUser, signUpUser, signOutUser, getSession, onAuthStateChange, getProfile, updateProfile, fetchTasks, addTask, updateTask, deleteTask, fetchGraveyard, addToGraveyard } from "./api.js";
import { playSound } from "./sounds.js";
import { renderChessboard, getAvailableSquare, pieceIcons, piecePoints } from "./board.js";
import { renderTasks } from "./tasks.js";

// Global App State
let currentUser = null;
let profile = null;
let tasksList = [];
let graveyardList = [];

// DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app-container');
const displayUsername = document.getElementById('display-username');
const eloRating = document.getElementById('elo-rating');
const playerTitle = document.getElementById('player-title');
const themeSelect = document.getElementById('theme-select');
const chessQuote = document.getElementById('chess-quote');

const quotes = [
    '"Every chess game is a new life." — Sergiu Samarian',
    '"Play the opening like a book, the middlegame like a magician, and the endgame like a machine." — Rudolf Spielmann',
    '"Chess is the struggle against the error." — Johannes Zukertort',
    '"I don\'t believe in psychology. I believe in good moves." — Bobby Fischer',
    '"The most powerful weapon in chess is to have the next move." — David Bronstein',
    '"Chess is a war over the board. The object is to crush the opponent\'s mind." — Bobby Fischer'
];

function getTitle(elo) {
    if (elo < 1200) return 'Contender';
    if (elo < 1500) return 'Club Player';
    if (elo < 1800) return 'Candidate Master';
    if (elo < 2000) return 'FIDE Master';
    if (elo < 2200) return 'International Master';
    return 'Grandmaster';
}

function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    if (themeSelect) themeSelect.value = themeName;
}

// ---------------------------------------------------------
// Core UI Updaters
// ---------------------------------------------------------
function updateStatsUI() {
    if (!profile) return;
    eloRating.innerText = profile.elo;
    playerTitle.innerText = getTitle(profile.elo);
    document.getElementById('stat-active').innerText = tasksList.length;
    
    const completedCount = graveyardList.length;
    document.getElementById('stat-completed').innerText = completedCount;
    document.getElementById('stat-captured').innerText = profile.captured_count;
    
    const totalFinished = completedCount + profile.captured_count;
    const winrate = totalFinished === 0 ? 100 : Math.round((completedCount / totalFinished) * 100);
    document.getElementById('stat-winrate').innerText = `${winrate}%`;
}

function renderGraveyardUI() {
    const container = document.getElementById('graveyard');
    if (!container) return;
    container.innerHTML = '';
    
    graveyardList.forEach(item => {
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.innerHTML = pieceIcons[item.priority] || '♙';
        span.title = `Checkmated: "${item.text}"`;
        container.appendChild(span);
    });
}

function refreshAll() {
    updateStatsUI();
    renderTasks(tasksList, {
        onMove: handleMovePhase,
        onCheckmate: handleCheckmate,
        onCapture: handleCapture
    });
    renderChessboard(tasksList);
    renderGraveyardUI();
}

// ---------------------------------------------------------
// Data Fetching & State Hydration
// ---------------------------------------------------------
async function loadUserData(userId) {
    try {
        profile = await getProfile(userId);
        tasksList = await fetchTasks();
        graveyardList = await fetchGraveyard();
        
        displayUsername.innerText = profile.username;
        
        const avatarContainer = document.getElementById('profile-avatar-container');
        if (profile.avatar_url) {
            avatarContainer.innerHTML = `<img src="${profile.avatar_url}" class="profile-img" alt="Avatar">`;
        } else {
            avatarContainer.innerHTML = `<span class="player-piece">♔</span>`;
        }

        applyTheme(profile.theme || 'obsidian');
        refreshAll();
    } catch (e) {
        console.error("Failed to load user data", e);
    }
}

// ---------------------------------------------------------
// Auth Observers & Handlers
// ---------------------------------------------------------
onAuthStateChange(async (event, session) => {
    if (session && session.user) {
        currentUser = session.user;
        authOverlay.classList.add('hidden');
        appContainer.classList.remove('authenticated-only');
        await loadUserData(currentUser.id);
    } else {
        currentUser = null;
        profile = null;
        tasksList = [];
        graveyardList = [];
        authOverlay.classList.remove('hidden');
        appContainer.classList.add('authenticated-only');
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('login-error');
    errorMsg.innerText = 'Loading...';
    
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    
    const { error } = await signInUser(u, p);
    if (error) {
        errorMsg.innerText = error.message;
    } else {
        errorMsg.innerText = '';
        playSound('move');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMsg = document.getElementById('register-error');
    const successMsg = document.getElementById('register-success');
    errorMsg.innerText = 'Creating profile...';
    successMsg.innerText = '';
    
    const u = document.getElementById('register-username').value.trim();
    const p = document.getElementById('register-password').value;
    const a = document.getElementById('register-avatar').value.trim();
    
    const { error } = await signUpUser(u, p, a || null);
    if (error) {
        errorMsg.innerText = error.message;
    } else {
        errorMsg.innerText = '';
        successMsg.innerText = 'Profile created! You can now Sign In.';
        setTimeout(() => {
            document.getElementById('register-form').classList.remove('active');
            document.getElementById('login-form').classList.add('active');
            document.getElementById('login-username').value = u;
            document.getElementById('login-password').value = '';
            successMsg.innerText = '';
        }, 1500);
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    playSound('capture');
    await signOutUser();
});

// Toggle forms
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

// ---------------------------------------------------------
// Theme Selector
// ---------------------------------------------------------
if (themeSelect) {
    themeSelect.addEventListener('change', async (e) => {
        const theme = e.target.value;
        applyTheme(theme);
        if (currentUser) {
            await updateProfile(currentUser.id, { theme });
        }
    });
}

// ---------------------------------------------------------
// Task Actions
// ---------------------------------------------------------
document.getElementById('todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const input = document.getElementById('task-input');
    const dueDateInput = document.getElementById('task-due-date');
    const notesInput = document.getElementById('task-notes');
    
    const text = input.value.trim();
    if (!text) return;
    
    const priority = document.querySelector('input[name="priority"]:checked').value;
    const board_pos = getAvailableSquare('opening', tasksList);
    
    let due_date = dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null;
    let notes = notesInput.value.trim() || null;
    
    const newTask = {
        user_id: currentUser.id,
        text,
        priority,
        phase: 'opening',
        board_pos,
        due_date,
        notes
    };
    
    const addedTask = await addTask(newTask);
    if (addedTask) {
        tasksList.unshift(addedTask);
        playSound('move');
        input.value = '';
        dueDateInput.value = '';
        notesInput.value = '';
        chessQuote.innerText = quotes[Math.floor(Math.random() * quotes.length)];
        refreshAll();
    }
});

async function handleMovePhase(task, direction) {
    const phaseOrder = ['opening', 'middlegame', 'endgame'];
    const currentIdx = phaseOrder.indexOf(task.phase);
    
    let newIdx = currentIdx;
    if (direction === 'next' && currentIdx < 2) newIdx++;
    if (direction === 'prev' && currentIdx > 0) newIdx--;
    
    if (newIdx !== currentIdx) {
        const newPhase = phaseOrder[newIdx];
        const newPos = getAvailableSquare(newPhase, tasksList.filter(t => t.id !== task.id));
        
        // Optimistic UI update
        task.phase = newPhase;
        task.board_pos = newPos;
        playSound('move');
        refreshAll();
        
        await updateTask(task.id, { phase: newPhase, board_pos: newPos });
    }
}

async function handleCheckmate(task) {
    // Optimistic UI update
    tasksList = tasksList.filter(t => t.id !== task.id);
    graveyardList.unshift(task);
    profile.elo += piecePoints[task.priority] || 10;
    playSound('checkmate');
    refreshAll();
    
    // DB sync
    await addToGraveyard({
        user_id: currentUser.id,
        text: task.text,
        priority: task.priority
    });
    await deleteTask(task.id);
    await updateProfile(currentUser.id, { elo: profile.elo });
}

async function handleCapture(task) {
    // Optimistic UI update
    tasksList = tasksList.filter(t => t.id !== task.id);
    profile.captured_count += 1;
    profile.elo = Math.max(100, profile.elo - Math.round((piecePoints[task.priority] || 10) / 2));
    playSound('capture');
    refreshAll();
    
    // DB sync
    await deleteTask(task.id);
    await updateProfile(currentUser.id, { elo: profile.elo, captured_count: profile.captured_count });
}

// ---------------------------------------------------------
// Leaderboard Modal
// ---------------------------------------------------------
import { fetchLeaderboard } from "./api.js";

const leaderboardBtn = document.getElementById("leaderboard-btn");
const leaderboardModal = document.getElementById("leaderboard-modal");
const closeLeaderboard = document.getElementById("close-leaderboard");
const leaderboardList = document.getElementById("leaderboard-list");

if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", async () => {
        leaderboardModal.classList.remove("hidden");
        leaderboardList.innerHTML = "Loading rankings...";
        const data = await fetchLeaderboard();
        leaderboardList.innerHTML = "";
        
        data.forEach((player, index) => {
            const avatarHtml = player.avatar_url 
                ? `<img src="${player.avatar_url}" class="avatar">` 
                : `<div class="avatar" style="display:flex;align-items:center;justify-content:center;">?</div>`;
            
            const row = document.createElement("div");
            row.className = "leaderboard-item";
            row.innerHTML = `
                <div class="user-info">
                    <span class="rank">#${index + 1}</span>
                    ${avatarHtml}
                    <span>${player.username}</span>
                </div>
                <div class="stats">
                    <div class="elo">${player.elo} ELO</div>
                    <div>${player.captured_count} Captures</div>
                </div>
            `;
            leaderboardList.appendChild(row);
        });
    });
}

if (closeLeaderboard) {
    closeLeaderboard.addEventListener("click", () => {
        leaderboardModal.classList.add("hidden");
    });
}

