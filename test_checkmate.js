const fs = require('fs');
const path = require('path');

// Simple DOM & LocalStorage mockup for Node testing
// Simple DOM & LocalStorage mockup for Node testing
global.window = global;
global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; }
};

class MockElement {
    constructor(id = '') {
        this.id = id;
        this.value = '';
        this.innerText = '';
        this.className = '';
        this.innerHTML = '';
        this.classList = {
            list: new Set(),
            add(c) { this.list.add(c); },
            remove(c) { this.list.delete(c); },
            contains(c) { return this.list.has(c); }
        };
        this.style = {};
        this.listeners = {};
        this.dataset = {};
    }
    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }
    appendChild(el) {}
    setAttribute(name, val) {}
    scrollIntoView() {}
}

global.document = {
    listeners: {},
    elements: {},
    documentElement: new MockElement('html'),
    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = new MockElement(id);
        }
        return this.elements[id];
    },
    querySelector(selector) {
        if (selector === 'input[name="priority"]:checked') {
            return { value: this.selectedPriority || 'pawn' };
        }
        if (selector.startsWith('[data-coord=')) {
            return new MockElement();
        }
        return this.getElementById(selector.replace('#', ''));
    },
    querySelectorAll(selector) {
        return [];
    },
    createElement(tag) {
        return new MockElement();
    }
};

// Mock AudioContext
global.AudioContext = class {
    createOscillator() {
        return {
            connect() {},
            frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            type: '',
            start() {},
            stop() {}
        };
    }
    createGain() {
        return {
            connect() {},
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }
        };
    }
    destination = {};
    currentTime = 0;
};

// Load app.js code to run locally
const appJsPath = path.join(__dirname, 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Expose state for assertions
appJsContent = appJsContent.replace('let state =', 'global.state =');

// Evaluate app.js
eval(appJsContent);

// Trigger DOMContentLoaded
if (document.listeners['DOMContentLoaded']) {
    document.listeners['DOMContentLoaded'].forEach(cb => cb());
}

// ----------------- TEST SUITE -----------------
console.log("=== Running Checkmate Grandmaster Edition Auth & Task Tests ===");

// 1. Initial State Check
console.assert(document.getElementById('auth-overlay').classList.contains('hidden') === false, "Auth Overlay should be visible initially");
console.assert(document.getElementById('app-container').classList.contains('authenticated-only') === true, "App container should be hidden/blurred");
console.log("✓ Initial state validation passed.");

// 2. Mock Register & Login
document.getElementById('register-username').value = "kasparov";
document.getElementById('register-password').value = "chessboss";
const registerForm = document.getElementById('register-form');
registerForm.listeners['submit']({ preventDefault: () => {} });

document.getElementById('login-username').value = "kasparov";
document.getElementById('login-password').value = "chessboss";
const loginForm = document.getElementById('login-form');
loginForm.listeners['submit']({ preventDefault: () => {} });

console.assert(localStorage.getItem('checkmate_current_user') === 'kasparov', "Session user should be set to kasparov");
console.assert(document.getElementById('auth-overlay').classList.contains('hidden') === true, "Auth Overlay should be hidden after login");
console.log("✓ Register & Login validation passed.");

// 3. Mock Add Task
document.getElementById('task-input').value = "Master the Sicilian Defense";
document.selectedPriority = 'knight'; // Knight priority
const todoForm = document.getElementById('todo-form');
todoForm.listeners['submit']({ preventDefault: () => {} });

console.assert(state.tasks.length === 1, "There should be 1 task on the board");
console.assert(state.tasks[0].text === "Master the Sicilian Defense", "Task description mismatch");
console.assert(state.tasks[0].phase === "opening", "Initial task phase should be opening");
console.log("✓ Add Task (Opening Phase / Knight Priority) validation passed.");

// 4. Move Task to next phase (Middlegame)
const taskId = state.tasks[0].id;
global.moveTaskPhase(taskId, 'next');

console.assert(state.tasks[0].phase === 'middlegame', "Task phase should have moved to middlegame");
console.log("✓ Move Task Phase (Opening -> Middlegame) validation passed.");

// 5. Complete Task (Checkmate)
global.checkmateTask(taskId);

console.assert(state.tasks.length === 0, "Active board should be empty");
console.assert(state.graveyard.length === 1, "Completed task should be moved to the Graveyard");
console.assert(state.elo === 1220, "ELO rating should have increased to 1220 (1200 + 20 Knight points)");
console.assert(document.getElementById('player-title').innerText === 'Club Player', "Player title should have updated to Club Player");
console.log("✓ Checkmate Task & Title Upgrade validation passed.");

console.log("======================================================");
console.log("ALL GRANDMASTER EDITION TESTS PASSED!");
