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

function getApiErrorMessage(error, fallback = "Произошла ошибка") {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error.message) return error.message;

    const data = error.data || null;
    if (data?.detail) return data.detail;
    if (data?.error) return data.error;
    if (data?.errors && typeof data.errors === "object") {
        const firstField = Object.keys(data.errors)[0];
        const firstError = data.errors[firstField];
        if (Array.isArray(firstError) && firstError.length) return firstError[0];
        if (typeof firstError === "string") return firstError;
    }
    return fallback;
}

function renderLoader(message = "Загрузка...") {
    return `
        <div class="text-center py-10">
            <div class="inline-block w-7 h-7 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p class="text-sm text-slate-400 font-bold">${message}</p>
        </div>
    `;
}

function renderEmptyState(message = "Пока пусто") {
    return `
        <div class="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <p class="text-slate-400 italic text-sm">${message}</p>
        </div>
    `;
}

