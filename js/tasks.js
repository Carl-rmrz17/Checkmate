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
    document.querySelectorAll('.task-card').forEach(c => c.style.boxShadow = '');
    document.querySelectorAll('.square').forEach(s => s.classList.remove('highlighted'));
    
    const card = document.getElementById(`task-${id}`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        card.style.boxShadow = 'var(--shadow-glow)';
        
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
        const tabBadge = document.getElementById(`tab-badge-${phase}`);
        if (tabBadge) tabBadge.innerText = phaseTasks.length;
        
        if (phaseTasks.length === 0) {
            let msg = 'Plan your next move!';
            if (phase === 'middlegame') msg = 'No tactics currently active.';
            if (phase === 'endgame') msg = 'No endgame drills lined up.';
            
            column.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="ghost"></i>
                    <p>${msg}</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons({ root: column });
            return;
        }
        
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
                    metaHtml += `<span class="task-date ${isOverdue ? 'overdue' : ''}"><i data-lucide="clock"></i> ${dateStr}</span>`;
                }
                if (task.notes) {
                    metaHtml += `<span class="task-notes"><i data-lucide="align-left"></i> ${escapeHTML(task.notes)}</span>`;
                }
                metaHtml += '</div>';
            }
            
            let iconName = 'arrow-up';
            if (task.priority === 'knight') iconName = 'navigation';
            if (task.priority === 'rook') iconName = 'tower-control';
            if (task.priority === 'king') iconName = 'crown';

            card.innerHTML = `
                <div class="task-header">
                    <div class="task-piece" title="${task.priority}">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <span class="badge" title="Board Position">${task.board_pos.toUpperCase()}</span>
                </div>
                <div class="task-text">${escapeHTML(task.text)}</div>
                ${metaHtml}
                <div class="task-actions">
                    <div style="display: flex; gap: 4px;">
                        ${phase !== 'opening' ? `<button class="task-action-btn prev-btn" title="Move back"><i data-lucide="chevron-left"></i></button>` : ''}
                        ${phase !== 'endgame' ? `<button class="task-action-btn next-btn" title="Move forward"><i data-lucide="chevron-right"></i></button>` : ''}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="task-action-btn complete-btn checkmate-btn" title="Checkmate"><i data-lucide="check"></i> Mate</button>
                        <button class="task-action-btn delete-btn capture-btn" title="Capture (Delete)"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `;
            
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                highlightTaskCard(task.id, task.board_pos);
            });
            
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
        
        if (window.lucide) window.lucide.createIcons({ root: column });
    });
}
