window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access');
    updateNav();

    const hashPage = typeof getPageFromHash === "function" ? getPageFromHash() : null;
    const initialPage = hashPage || (token ? 'dashboard' : 'home');
    showPage(initialPage, { syncHash: false });

    if (token) {
        Notifications.init();
    }
});

window.addEventListener('hashchange', () => {
    const token = localStorage.getItem('access');
    const hashPage = typeof getPageFromHash === "function" ? getPageFromHash() : null;
    const nextPage = hashPage || (token ? 'dashboard' : 'home');
    showPage(nextPage, { syncHash: false });
});
