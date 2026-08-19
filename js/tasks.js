import { pieceIcons } from "./board.js";

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

export function highlightTaskCard(id, boardPos) {
    // Remove previous highlights
    document.querySelectorAll('.task-card').forEach(c => c.style.boxShadow = '');
    document.querySelectorAll('.board-square').forEach(s => s.classList.remove('highlighted'));
    
    const card = document.getElementById(`task-${id}`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        card.style.boxShadow = '0 0 15px var(--gold)';
        
        if (boardPos) {
            const square = document.querySelector(`[data-coord="${boardPos}"]`);
            if (square) square.classList.add('highlighted');
        }
    }
}

export function renderTasks(tasks, handlers) {
    const phases = ['opening', 'middlegame', 'endgame'];
    
    phases.forEach(phase => {
        const column = document.getElementById(`tasks-${phase}`);
        const badge = document.getElementById(`badge-${phase}`);
        if (!column) return;
        column.innerHTML = '';
        
        const phaseTasks = tasks.filter(t => t.phase === phase);
        if (badge) badge.innerText = phaseTasks.length;
        
        phaseTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card ${task.priority}`;
            card.id = `task-${task.id}`;
            
            let metaHtml = '';
            if (task.due_date || task.notes) {
                metaHtml = '<div class="task-meta">';
                if (task.due_date) {
                    const isOverdue = new Date(task.due_date) < new Date();
                    const dateStr = new Date(task.due_date).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    metaHtml += `<span class="${isOverdue ? 'urgent' : ''}">🕒 ${dateStr}</span>`;
                }
                if (task.notes) {
                    metaHtml += `<span>📝 ${escapeHTML(task.notes)}</span>`;
                }
                metaHtml += '</div>';
            }

            card.innerHTML = `
                <div class="task-header">
                    <span class="task-piece-indicator">${pieceIcons[task.priority]}</span>
                    <span class="task-board-pos">${task.board_pos.toUpperCase()}</span>
                </div>
                <div class="task-text">${escapeHTML(task.text)}</div>
                ${metaHtml}
                <div class="task-actions">
                    <div class="phase-nav-btns">
                        ${phase !== 'opening' ? `<button class="nav-btn prev-btn">←</button>` : ''}
                        ${phase !== 'endgame' ? `<button class="nav-btn next-btn">→</button>` : ''}
                    </div>
                    <div class="action-row">
                        <button class="action-btn checkmate-btn">Checkmate</button>
                        <button class="action-btn capture-btn">Capture</button>
                    </div>
                </div>
            `;
            
            // Add click listener to highlight corresponding square on board
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return; // ignore actions
                highlightTaskCard(task.id, task.board_pos);
            });
            
            // Attach specific action listeners
            if (phase !== 'opening') {
                card.querySelector('.prev-btn').addEventListener('click', () => handlers.onMove(task, 'prev'));
            }
            if (phase !== 'endgame') {
                card.querySelector('.next-btn').addEventListener('click', () => handlers.onMove(task, 'next'));
            }
            
            card.querySelector('.checkmate-btn').addEventListener('click', () => handlers.onCheckmate(task));
            card.querySelector('.capture-btn').addEventListener('click', () => handlers.onCapture(task));
            
            column.appendChild(card);
        });
    });
}
