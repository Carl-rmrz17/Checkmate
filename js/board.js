import { highlightTaskCard } from "./tasks.js";

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

export const pieceIcons = {
    pawn: '♙',
    knight: '♘',
    rook: '♖',
    king: '♔'
};

export const piecePoints = {
    pawn: 10,
    knight: 20,
    rook: 35,
    king: 50
};

export function renderChessboard(tasks) {
    const board = document.getElementById('chess-board');
    if (!board) return;
    board.innerHTML = '';
    
    // Create coordinate mapping for easy lookup
    const pieceMap = {};
    tasks.forEach(t => {
        if (t.board_pos) pieceMap[t.board_pos] = t;
    });
    
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
                    highlightTaskCard(task.id, task.board_pos);
                });
            }
            
            board.appendChild(square);
        }
    }
}

export function getAvailableSquare(phase, currentTasks) {
    let allowedRanks = [1, 2, 3];
    if (phase === 'middlegame') allowedRanks = [4, 5];
    if (phase === 'endgame') allowedRanks = [6, 7, 8];
    
    const activePositions = currentTasks.map(t => t.board_pos);
    
    // Try to find a free square randomly
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
