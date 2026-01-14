function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; // Убедись, что в HTML есть <div id="toast-container"></div>

    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'bg-emerald-500' : 'bg-rose-500';

    toast.className = `${colorClass} text-white px-6 py-3 rounded-2xl shadow-lg fade-in mb-2 flex items-center gap-2`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

