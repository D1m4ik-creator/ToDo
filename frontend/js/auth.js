// Получение профиля
async function fetchProfile() {
    const token = localStorage.getItem('access');
    if (!token) {
        showPage('login');
        return null;
    }
    try {
        const response = await fetch(`${API_URL}/auth/me/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) return await response.json();
        throw new Error("Сессия истекла");
    } catch (err) {
        handleLogout();
        return null;
    }
}

// Обработка форм входа/регистрации
async function handleAuth(event, type) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    const endpoint = type === 'register' ? '/register/' : '/login/';

    try {
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('access', result.tokens.access);
            localStorage.setItem('refresh', result.tokens.refresh);
            localStorage.setItem('user', JSON.stringify(result.user));
            showPage('dashboard');
            updateNav();
        } else {
            showToast("Ошибка авторизации", "error");
            console.error(result);
        }
    } catch (err) {
        showToast("Нет связи с сервером", "error");
    }
}

function handleLogout() {
    localStorage.clear();
    showPage('home');
    updateNav();
}

// Генерация HTML форм
function renderForm(title, type) {
    const isReg = type === 'register';
    return `
        <div class="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <h2 class="text-3xl font-bold mb-8 text-center">${title}</h2>
            <form id="${type}-form" onsubmit="handleAuth(event, '${type}')" class="space-y-4">
                ${isReg ? '<input type="text" name="username" placeholder="Ваше имя" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl">' : ''}
                <input type="email" name="email" placeholder="Email" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <input type="password" name="password" placeholder="Пароль" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl">
                ${isReg ? '<input type="password" name="password_confirm" placeholder="Повторите пароль" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl">' : ''}
                <button type="submit" class="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition mt-4">
                    ${isReg ? 'Создать аккаунт' : 'Войти'}
                </button>
                <p class="text-center text-sm text-slate-400 mt-4 cursor-pointer hover:text-indigo-600" onclick="showPage('${isReg ? 'login' : 'register'}')">
                    ${isReg ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
                </p>
            </form>
        </div>`;
}