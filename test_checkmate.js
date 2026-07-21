const fs = require('fs');
const path = require('path');

// Simple DOM & LocalStorage mockup for Node testing
global.window = global;
global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = String(value); },
    removeItem(key) { delete this.store[key]; },
    clear() { this.store = {}; }
};

global.document = {
    listeners: {},
    elements: {},
    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    },
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                id,
                value: '',
                innerText: '',
                className: '',
                classList: {
                    list: new Set(),
                    add(c) { this.list.add(c); },
                    remove(c) { this.list.delete(c); },
                    contains(c) { return this.list.has(c); }
                },
                style: {},
                listeners: {},
                addEventListener(event, callback) {
                    this.listeners[event] = callback;
                },
                submit(e) {
                    if (this.listeners['submit']) this.listeners['submit'](e);
                },
                click() {
                    if (this.listeners['click']) this.listeners['click']({ preventDefault: () => {} });
                },
                appendChild(child) {}
            };
        }
        return this.elements[id];
    },
    createElement(tag) {
        return {
            tagName: tag.toUpperCase(),
            value: '',
            innerText: '',
            className: '',
            classList: {
                list: new Set(),
                add(c) { this.list.add(c); },
                remove(c) { this.list.delete(c); },
                contains(c) { return this.list.has(c); }
            },
            style: {},
            listeners: {},
            addEventListener(event, callback) {
                this.listeners[event] = callback;
            },
            appendChild(child) {}
        };
    },
    querySelector(selector) {
        if (selector === 'input[name="priority"]:checked') {
            return { value: this.selectedPriority || 'pawn' };
        }
        return this.getElementById(selector.replace('#', ''));
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
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Evaluate app.js (replacing let/const at top-level with var so they're in scope)
eval(appJsContent.replace(/\blet\b/g, 'var'));

// Trigger DOMContentLoaded
if (document.listeners['DOMContentLoaded']) {
    document.listeners['DOMContentLoaded'].forEach(cb => cb());
}

// ----------------- TEST SUITE -----------------
console.log("=== Running Checkmate Authentication & Task Tests ===");

// 1. Initial State Check
console.assert(document.getElementById('auth-overlay').classList.contains('hidden') === false, "Auth Overlay should be visible initially");
console.assert(document.getElementById('app-container').classList.contains('authenticated-only') === true, "App container should be hidden/blurred");
console.log("✓ Initial state validation passed.");

// 2. Mock Register
document.getElementById('register-username').value = "magnus";
document.getElementById('register-password').value = "carlsen123";
const registerForm = document.getElementById('register-form');
registerForm.listeners['submit']({ preventDefault: () => {} });

// Check registry
const registry = JSON.parse(localStorage.getItem('checkmate_registry'));
console.assert(registry && registry['magnus'] !== undefined, "Player registry should contain magnus");
console.assert(registry['magnus'].password === 'carlsen123', "Player password should match");
console.log("✓ User registration validation passed.");

// 3. Mock Login
document.getElementById('login-username').value = "magnus";
document.getElementById('login-password').value = "carlsen123";
const loginForm = document.getElementById('login-form');
loginForm.listeners['submit']({ preventDefault: () => {} });

console.assert(localStorage.getItem('checkmate_current_user') === 'magnus', "Session user should be set to magnus");
console.assert(document.getElementById('auth-overlay').classList.contains('hidden') === true, "Auth Overlay should be hidden after login");
console.log("✓ User login validation passed.");

// 4. Mock Add Task
document.getElementById('task-input').value = "Defeat the computer";
document.selectedPriority = 'king'; // King priority
const todoForm = document.getElementById('todo-form');
todoForm.listeners['submit']({ preventDefault: () => {} });

console.assert(state.tasks.length === 1, "There should be 1 task on the board");
console.assert(state.tasks[0].text === "Defeat the computer", "Task description mismatch");
console.assert(state.tasks[0].priority === "king", "Task priority should be king");
console.log("✓ Add Task (King Priority) validation passed.");

// 5. Complete Task (Checkmate)
const taskId = state.tasks[0].id;
global.checkmateTask(taskId);

console.assert(state.tasks.length === 0, "Active board should be empty");
console.assert(state.graveyard.length === 1, "Completed task should be moved to the Graveyard");
console.assert(state.elo === 1250, "ELO rating should have increased to 1250 (1200 + 50 King points)");
console.log("✓ Checkmate Task (ELO increase & Graveyard) validation passed.");

// 6. Mock Logout
document.getElementById('logout-btn').click();
console.assert(localStorage.getItem('checkmate_current_user') === null, "Current user session should be cleared");
console.assert(document.getElementById('auth-overlay').classList.contains('hidden') === false, "Auth Overlay should show up after logout");
console.log("✓ Logout validation passed.");

console.log("======================================================");
console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
