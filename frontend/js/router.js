const SPA_PAGES = new Set(['home', 'login', 'register', 'dashboard']);

function getPageFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    if (!hash || !SPA_PAGES.has(hash)) return null;
    return hash;
}

async function showPage(page, options = {}) {
    const syncHash = options.syncHash !== false;
    const safePage = SPA_PAGES.has(page) ? page : 'home';

    if (syncHash) {
        const nextHash = safePage === 'home' ? '' : `#${safePage}`;
        if (window.location.hash !== nextHash) {
            window.location.hash = nextHash;
        }
    }

    const content = document.getElementById('app-content');
    content.className = "pt-24 min-h-screen fade-in px-4";

    if (window.timerInterval) clearInterval(window.timerInterval);

    if (safePage === 'home') {
        content.innerHTML = `
            <div class="max-w-4xl mx-auto text-center px-4">
                <h1 class="text-6xl font-extrabold mb-6"><span class="gradient-text">Управляй проектами</span> по-умному</h1>
                <p class="text-xl text-slate-500 mb-10">Профессиональный таск-менеджер с AI-ассистентом.</p>
                <div class="flex justify-center gap-4">
                    <button onclick="showPage('dashboard')" class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition">Создать проект</button>
                </div>
            </div>`;
    }
    else if (safePage === 'login') content.innerHTML = renderForm('Вход', 'login');
    else if (safePage === 'register') content.innerHTML = renderForm('Регистрация', 'register');
    else if (safePage === 'dashboard') {
        content.innerHTML = renderLoader("Загружаем рабочее пространство...");
        const user = await fetchProfile();
        if (user) {
            renderDashboard(user);
            startIdTimer();
        }
    }
}

function updateNav() {
    const isAuth = !!localStorage.getItem('access');
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    if (isAuth) {
        navLinks.innerHTML = `<button onclick="showPage('dashboard')" class="font-medium text-indigo-600">Рабочий стол</button> <button onclick="handleLogout()" class="text-red-500 ml-4">Выход</button>`;
    } else {
        navLinks.innerHTML = `
            <button onclick="showPage('login')" class="px-4 py-2 text-slate-600 hover:text-indigo-600 font-medium transition">Войти</button>
            <button onclick="showPage('register')" class="px-5 py-2 bg-indigo-600 text-white rounded-full">Начать</button>`;
    }
}
