// js/dashboard.js

// Основной каркас
function renderDashboard(user) {
    const content = document.getElementById('app-content');

    // Проверка на ошибки, чтобы не крашилось
    const safeUser = user || { public_id: 'UNKNOWN' };

    content.innerHTML = `
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h2 class="text-3xl font-bold">Рабочее пространство</h2>
                    <p class="text-slate-500 text-sm">Управляйте вашими проектами и командами</p>
                </div>
                <div class="flex bg-slate-200/50 p-1 rounded-2xl">
                    <button onclick="switchTab('overview')" id="tab-overview" class="px-6 py-2.5 rounded-xl font-medium transition tab-btn active-tab">Обзор</button>
                    <button onclick="switchTab('teams')" id="tab-teams" class="px-6 py-2.5 rounded-xl font-medium transition tab-btn">Команды</button>
                </div>
            </div>
            <div id="tab-content" class="fade-in"></div>
        </div>
    `;
    // Сразу переключаем на обзор
    switchTab('overview');
}

// Вкладка "Обзор"
async function renderOverviewTab(container) {
    // 1. Сначала показываем то, что есть в памяти (или тире)
    let user = JSON.parse(localStorage.getItem('user')) || {};

    const renderContent = (u) => `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div id="id-progress" class="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-1000" style="width: 100%"></div>
                <h3 class="text-xl font-bold mb-4">Ваш профиль</h3>
                <div class="space-y-4">
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Динамический ID</span>
                        <div id="dynamic-id-display" class="text-2xl font-mono font-black text-indigo-600 mt-1 uppercase">
                            ${u.public_id || '------'}
                        </div>
                        <div id="id-timer-text" class="text-right text-xs text-slate-400 mt-1 italic">Обновление...</div>
                    </div>
                </div>
            </div>
            </div>
    `;

    container.innerHTML = renderContent(user);

    // 2. СРАЗУ запрашиваем свежий профиль с бэкенда
    const freshUser = await fetchProfile();
    if (freshUser) {
        localStorage.setItem('user', JSON.stringify(freshUser));
        const idDisplay = document.getElementById('dynamic-id-display');
        if (idDisplay) idDisplay.innerText = freshUser.public_id;
    }
}

// Переключение табов
async function switchTab(tabName) {
    const container = document.getElementById('tab-content');
    if (!container) return;

    container.innerHTML = '';
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active-tab', 'bg-white', 'shadow-sm', 'text-indigo-600');
        btn.classList.add('text-slate-500');
    });

    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('bg-white', 'shadow-sm', 'text-indigo-600');
    }

    if (tabName === 'overview') renderOverviewTab(container);
    else if (tabName === 'teams') {
        if (typeof renderTeamsTab === 'function') {
            await renderTeamsTab(container);
        } else {
            console.error("renderTeamsTab не найдена");
        }
    }
}

// Таймер
function startIdTimer() {
    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerInterval = setInterval(async () => {
        const seconds = new Date().getSeconds();
        const timeLeft = 60 - seconds;
        const timerText = document.getElementById('id-timer-text');
        const progressBar = document.getElementById('id-progress');

        if (timerText) timerText.innerText = `${timeLeft}s`;
        if (progressBar) progressBar.style.width = `${(timeLeft / 60) * 100}%`;

        if (seconds === 0) {
            // Проверка наличия функции fetchProfile
            if (typeof fetchProfile === 'function') {
                const user = await fetchProfile();
                const idDisplay = document.getElementById('dynamic-id-display');
                if (idDisplay && user) {
                    idDisplay.innerText = user.public_id;
                    idDisplay.classList.add('pulse-indigo');
                    setTimeout(() => idDisplay.classList.remove('pulse-indigo'), 2000);
                }
            }
        }
    }, 1000);
}