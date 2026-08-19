export function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML = `
        <div class="toast-icon">
            <i data-lucide="${iconName}"></i>
        </div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close" aria-label="Close notification">
            <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
    `;

    container.appendChild(toast);
    
    // Initialize icons for this specific toast
    if (window.lucide) {
        window.lucide.createIcons({ root: toast });
    }

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Setup remove logic
    const removeToast = () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    };

    toast.querySelector('.toast-close').addEventListener('click', removeToast);

    if (duration > 0) {
        setTimeout(removeToast, duration);
    }
}
