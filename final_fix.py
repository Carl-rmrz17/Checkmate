import re

with open("js/main.js", "r", encoding="utf-8") as f:
    content = f.read()

lb_pattern = re.compile(r"// Leaderboard Modal\n\s*// -+\n.*", re.DOTALL)
new_lb = """// Leaderboard Modal
// ---------------------------------------------------------
const leaderboardBtn = document.getElementById("leaderboard-btn");
const leaderboardModal = document.getElementById("leaderboard-modal");
const closeLeaderboardBtn = document.getElementById("close-leaderboard");
const leaderboardList = document.getElementById("leaderboard-list");
const pinnedUserRank = document.getElementById("pinned-user-rank");
let leaderboardSubscription = null;

async function loadLeaderboard() {
    leaderboardList.innerHTML = '<div class="empty-state"><i data-lucide="loader-2" class="spin"></i><p>Loading global rankings...</p></div>';
    pinnedUserRank.classList.add('hidden');
    if (window.lucide) window.lucide.createIcons({ root: leaderboardList });
    
    try {
        const topPlayers = await fetchLeaderboard(50);
        
        if (topPlayers.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state"><i data-lucide="trophy"></i><p>No players on the leaderboard yet.</p></div>';
            if (window.lucide) window.lucide.createIcons({ root: leaderboardList });
            return;
        }
        
        leaderboardList.innerHTML = topPlayers.map((p, index) => {
            const rank = index + 1;
            return `
            <div class="leaderboard-item ${currentUser && p.id === currentUser.id ? 'current-user-item' : ''}">
                <div class="lb-rank rank-${rank}">#${rank}</div>
                <div class="lb-user-info">
                    <div class="lb-avatar">${p.username ? p.username.charAt(0).toUpperCase() : '?'}</div>
                    <span class="lb-username">${p.username || 'Unknown'}</span>
                </div>
                <div class="lb-score">${p.elo} pts</div>
            </div>
            `;
        }).join('');
        
        // Pinned User Logic
        if (currentUser && profile) {
            const userInTopIndex = topPlayers.findIndex(p => p.id === currentUser.id);
            let userRank = userInTopIndex !== -1 ? userInTopIndex + 1 : null;
            
            // Note: Since we don't have the fetchUserRank imported properly to avoid circular dependency issues, we will just use the current top players list.
            if (!userRank && profile) {
                userRank = "50+";
            }
            
            if (userRank) {
                pinnedUserRank.innerHTML = `
                    <div class="lb-rank">#${userRank}</div>
                    <div class="lb-user-info">
                        <div class="lb-avatar" style="border-color: var(--color-accent);">${profile.username ? profile.username.charAt(0).toUpperCase() : '?'}</div>
                        <span class="lb-username">You</span>
                    </div>
                    <div class="lb-score">${profile.elo} pts</div>
                `;
                pinnedUserRank.classList.remove('hidden');
            }
        }

    } catch (err) {
        leaderboardList.innerHTML = '<div class="empty-state"><p class="text-error">Failed to load leaderboard.</p></div>';
        showToast('error', 'Leaderboard Error', 'Could not fetch global rankings.');
    }
}

function setupLeaderboardRealtime() {
    if (leaderboardSubscription) return;
    
    leaderboardSubscription = supabase
        .channel('leaderboard-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
            if (!leaderboardModal.classList.contains('hidden')) {
                loadLeaderboard();
            }
        })
        .subscribe();
}

function teardownLeaderboardRealtime() {
    if (leaderboardSubscription) {
        supabase.removeChannel(leaderboardSubscription);
        leaderboardSubscription = null;
    }
}

leaderboardBtn?.addEventListener("click", () => {
    leaderboardModal.classList.remove("hidden");
    loadLeaderboard();
    setupLeaderboardRealtime();
});

closeLeaderboardBtn?.addEventListener("click", () => {
    leaderboardModal.classList.add("hidden");
    teardownLeaderboardRealtime();
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) {
        leaderboardModal.classList.add("hidden");
        teardownLeaderboardRealtime();
    }
    const logoutModal = document.getElementById('logout-modal');
    if (e.target === logoutModal) {
        logoutModal.classList.add('hidden');
    }
});

// Close modals on Escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        leaderboardModal?.classList.add("hidden");
        document.getElementById('logout-modal')?.classList.add('hidden');
        teardownLeaderboardRealtime();
    }
});
"""

content = lb_pattern.sub(new_lb, content)

# Also ensure fetchLeaderboard is imported at the top
if "fetchLeaderboard" not in content[:300]:
    content = content.replace('addToGraveyard } from "./api.js";', 'addToGraveyard, fetchLeaderboard } from "./api.js";')

with open("js/main.js", "w", encoding="utf-8") as f:
    f.write(content)
