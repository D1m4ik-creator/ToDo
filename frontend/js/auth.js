const GOOGLE_CLIENT_ID = "219724419452-gvnuibp42kbe3ts4gs0vdt2nesql45rq.apps.googleusercontent.com"
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

    // Мы добавляем div id="google-button-container" и разделитель
    setTimeout(initGoogleBtn, 100); // Небольшой хак: запускаем рендер кнопки чуть позже, когда HTML уже вставится в DOM

    return `
        <div class="max-w-md mx-auto bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-fade-in">
            <h2 class="text-3xl font-bold mb-8 text-center text-slate-800">${title}</h2>



            <div class="relative flex py-2 items-center mb-6">
                <div class="flex-grow border-t border-slate-200"></div>
                <span class="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold tracking-widest">Или через email</span>
                <div class="flex-grow border-t border-slate-200"></div>
            </div>

            <form id="${type}-form" onsubmit="handleAuth(event, '${type}')" class="space-y-4">
                ${isReg ? '<input type="text" name="username" placeholder="Ваше имя" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">' : ''}
                <input type="email" name="email" placeholder="Email" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">
                <input type="password" name="password" placeholder="Пароль" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">
                ${isReg ? '<input type="password" name="password_confirm" placeholder="Повторите пароль" required class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">' : ''}

                <button type="submit" class="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition mt-4 shadow-lg shadow-indigo-200">
                    ${isReg ? 'Создать аккаунт' : 'Войти'}
                </button>

                <div class="relative flex py-2 items-center mb-6">
                    <div class="flex-grow border-t border-slate-200"></div>
                    <span class="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold tracking-widest">Или через социальные сети</span>
                    <div class="flex-grow border-t border-slate-200"></div>
                 </div>

                <div id="google-button-container" class="mb-6 w-full flex justify-center"></div>

                <p class="text-center text-sm text-slate-400 mt-6 cursor-pointer hover:text-indigo-600 transition" onclick="showPage('${isReg ? 'login' : 'register'}')">
                    ${isReg ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
                </p>
            </form>
        </div>`;
}

async function handleGoogleCallback(response) {
    // response.credential - это JWT токен, который дал Google
    try {
        const backendResponse = await fetch(`${API_URL}/auth/google/callback/`, { // Твой новый эндпоинт
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: response.credential }) // Бэк ждет поле "token"
        });

        const result = await backendResponse.json();

        if (backendResponse.ok) {
            // Сохраняем токены так же, как при обычном входе
            localStorage.setItem('access', result.tokens.access);
            localStorage.setItem('refresh', result.tokens.refresh);
            localStorage.setItem('user', JSON.stringify(result.user));

            showToast("Вход выполнен успешно!", "success");
            showPage('dashboard');
            updateNav();
        } else {
            showToast(result.detail || "Ошибка входа через Google", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Ошибка соединения с сервером", "error");
    }
}

function initGoogleBtn() {
    // Проверяем, загрузился ли скрипт Google
    if (window.google && window.google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID, // Константа из config.js
            callback: handleGoogleCallback,
            use_fedcm_for_prompt: false
        });

        // Рендерим кнопку в контейнер
        const container = document.getElementById("google-button-container");
        if (container) {
            google.accounts.id.renderButton(
                container,
                { theme: "outline", size: "large", width: 350, text: "continue_with" } // Стили кнопки
            );
        }
    }
}