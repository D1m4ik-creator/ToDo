window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access');
    updateNav();
    if (token) {
        showPage('dashboard');
        Notifications.init();
    } else {
        showPage('home');
    }
});