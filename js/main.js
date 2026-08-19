import { supabase, signInUser, signUpUser, signOutUser, getSession, onAuthStateChange, getProfile, updateProfile, fetchTasks, addTask, updateTask, deleteTask, fetchGraveyard, addToGraveyard } from "./api.js";
import { playSound } from "./sounds.js";
import { renderChessboard, getAvailableSquare, pieceIcons, piecePoints } from "./board.js";
import { renderTasks } from "./tasks.js";
import { showToast } from "./toasts.js";

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
    '"Every chess game is a new life." â€” Sergiu Samarian',
    '"Play the opening like a book, the middlegame like a magician, and the endgame like a machine." â€” Rudolf Spielmann',
    '"Chess is the struggle against the error." â€” Johannes Zukertort',
    '"I don\'t believe in psychology. I believe in good moves." â€” Bobby Fischer',
    '"The most powerful weapon in chess is to have the next move." â€” David Bronstein',
    '"Chess is a war over the board. The object is to crush the opponent\'s mind." â€” Bobby Fischer'
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
        let iconName = 'arrow-up';
        if (item.priority === 'knight') iconName = 'navigation';
        if (item.priority === 'rook') iconName = 'tower-control';
        if (item.priority === 'king') iconName = 'crown';
        
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.innerHTML = `<i data-lucide="${iconName}" style="width:16px;height:16px;"></i>`;
        span.title = `Checkmated: "${item.text}"`;
        container.appendChild(span);
    });
    if (window.lucide) window.lucide.createIcons({ root: container });
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
            avatarContainer.innerHTML = `<span class="player-piece">â™”</span>`;
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


function getReadableError(error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials")) return "Incorrect email or password.";
    if (msg.includes("already registered")) return "An account with this email already exists.";
    if (msg.includes("password should be at least")) return "Password is too weak. Please use at least 6 characters.";
    return error.message;
}

function setBtnLoading(btn, isLoading, originalText) {
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Loading...';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
    if (window.lucide) window.lucide.createIcons();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setBtnLoading(btn, true, 'Sign In');
    
    const email = document.getElementById('login-email').value.trim();
    const p = document.getElementById('login-password').value;
    
    const { error } = await signInUser(email, p);
    if (error) {
        showToast('error', 'Login Failed', getReadableError(error));
        setBtnLoading(btn, false, 'Sign In');
    } else {
        playSound('move');
        showToast('success', 'Welcome Back', 'Successfully logged into the arena.');
        setBtnLoading(btn, false, 'Sign In');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    const email = document.getElementById('register-email').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const p = document.getElementById('register-password').value;
    const cp = document.getElementById('register-confirm-password').value;
    
    if (p !== cp) {
        showToast('warning', 'Mismatch', 'Passwords do not match.');
        return;
    }
    
    setBtnLoading(btn, true, 'Create Account');
    
    const { error } = await signUpUser(email, username, p);
    
    if (error) {
        showToast('error', 'Registration Failed', getReadableError(error));
        setBtnLoading(btn, false, 'Create Account');
    } else {
        playSound('capture');
        showToast('success', 'Profile Created', 'Welcome to CheckMate! You may now sign in.');
        
        setTimeout(() => {
            document.getElementById('register-form').classList.remove('active');
            document.getElementById('login-form').classList.add('active');
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';
            setBtnLoading(btn, false, 'Create Account');
        }, 1500);
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    document.getElementById('logout-modal').classList.remove('hidden');
});
document.getElementById('cancel-logout-btn').addEventListener('click', () => {
    document.getElementById('logout-modal').classList.add('hidden');
});
document.getElementById('confirm-logout-btn').addEventListener('click', async () => {
    document.getElementById('logout-modal').classList.add('hidden');
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
// Mobile Drawer & Password Toggles
// ---------------------------------------------------------
document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
});
document.getElementById('close-sidebar-btn')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
});

document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        if (window.lucide) window.lucide.createIcons({ root: btn });
    });
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
    
    // Optimistic setup
    const tempId = 'temp-' + Date.now();
    const newTask = {
        id: tempId,
        user_id: currentUser.id,
        text,
        priority,
        phase: 'opening',
        board_pos,
        due_date,
        notes,
        created_at: new Date().toISOString()
    };
    
    // Optimistic update
    tasksList.unshift(newTask);
    playSound('move');
    input.value = '';
    dueDateInput.value = '';
    notesInput.value = '';
    chessQuote.innerText = quotes[Math.floor(Math.random() * quotes.length)];
    refreshAll();
    
    // DB sync
    try {
        const addedTask = await addTask({
            user_id: newTask.user_id,
            text: newTask.text,
            priority: newTask.priority,
            phase: newTask.phase,
            board_pos: newTask.board_pos,
            due_date: newTask.due_date,
            notes: newTask.notes
        });
        // Replace temp task with real task
        tasksList = tasksList.map(t => t.id === tempId ? addedTask : t);
        showToast('success', 'Move Played', 'Task successfully added.');
    } catch (err) {
        // Rollback
        tasksList = tasksList.filter(t => t.id !== tempId);
        refreshAll();
        showToast('error', 'Sync Failed', 'Failed to save task to database.');
    }
});

window.handleMovePhase = async function(task, direction) {
    const phaseOrder = ['opening', 'middlegame', 'endgame'];
    const currentIdx = phaseOrder.indexOf(task.phase);
    
    let newIdx = currentIdx;
    if (direction === 'next' && currentIdx < 2) newIdx++;
    if (direction === 'prev' && currentIdx > 0) newIdx--;
    
    if (newIdx !== currentIdx) {
        const oldPhase = task.phase;
        const oldPos = task.board_pos;
        
        const newPhase = phaseOrder[newIdx];
        const newPos = getAvailableSquare(newPhase, tasksList.filter(t => t.id !== task.id));
        
        // Optimistic UI update
        task.phase = newPhase;
        task.board_pos = newPos;
        playSound('move');
        refreshAll();
        
        try {
            await updateTask(task.id, { phase: newPhase, board_pos: newPos });
        } catch (err) {
            // Rollback
            task.phase = oldPhase;
            task.board_pos = oldPos;
            refreshAll();
            showToast('error', 'Sync Failed', 'Failed to update task phase.');
        }
    }
}

window.handleCheckmate = async function(task) {
    const backupTasksList = [...tasksList];
    const backupGraveyard = [...graveyardList];
    const backupElo = profile.elo;
    
    // Optimistic UI update
    tasksList = tasksList.filter(t => t.id !== task.id);
    graveyardList.unshift(task);
    profile.elo += piecePoints[task.priority] || 10;
    playSound('checkmate');
    refreshAll();
    
    try {
        // DB sync
        await addToGraveyard({
            user_id: currentUser.id,
            text: task.text,
            priority: task.priority
        });
        await deleteTask(task.id);
        await updateProfile(currentUser.id, { elo: profile.elo });
        showToast('success', 'Checkmate!', 'Task completed successfully.');
    } catch (err) {
        // Rollback
        tasksList = backupTasksList;
        graveyardList = backupGraveyard;
        profile.elo = backupElo;
        refreshAll();
        showToast('error', 'Sync Failed', 'Failed to mark task as checkmate.');
    }
}

window.handleCapture = async function(task) {
    const backupTasksList = [...tasksList];
    const backupCapturedCount = profile.captured_count;
    const backupElo = profile.elo;
    
    // Optimistic UI update
    tasksList = tasksList.filter(t => t.id !== task.id);
    profile.captured_count += 1;
    profile.elo = Math.max(100, profile.elo - Math.round((piecePoints[task.priority] || 10) / 2));
    playSound('capture');
    refreshAll();
    
    try {
        // DB sync
        await deleteTask(task.id);
        await updateProfile(currentUser.id, { elo: profile.elo, captured_count: profile.captured_count });
        showToast('info', 'Task Captured', 'Task was deleted.');
    } catch (err) {
        // Rollback
        tasksList = backupTasksList;
        profile.captured_count = backupCapturedCount;
        profile.elo = backupElo;
        refreshAll();
        showToast('error', 'Sync Failed', 'Failed to delete task.');
    }
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


// ---------------------------------------------------------
// Auth UI Enhancements (Google & Password Toggle)
// ---------------------------------------------------------
import { signInWithGoogle } from "./api.js";

const googleBtn = document.getElementById("google-login-btn");
if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
        await signInWithGoogle();
    });
}

document.querySelectorAll(".password-toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if (input.type === "password") {
            input.type = "text";
        } else {
            input.type = "password";
        }
    });
});

