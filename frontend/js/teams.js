/**
 * Вспомогательная функция для проверки авторизации
 */
function getAuthHeaders() {
    const token = localStorage.getItem('access');
    if (!token) {
        showToast("Сессия истекла, войдите снова", "error");
        window.location.href = "/login.html";
        return null;
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Рендеринг основной вкладки команд
 */
function renderTeamsTab(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-black text-slate-800">Мои команды</h3>
                <button onclick="openTeamModal()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
                    </svg>
                    Создать команду
                </button>
            </div>
            <div id="teams-list-scroll" class="space-y-2"></div>
        </div>
    `;
    loadTeamsData();
}

/**
 * Загрузка списка команд
 */
async function loadTeamsData() {
    const listContainer = document.getElementById('teams-list-scroll');
    const headers = getAuthHeaders();
    if (!headers || !listContainer) return;

    try {
        const response = await fetch(`${API_URL}/teams/`, { headers });
        const teams = await response.json();

        if (teams.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p class="text-slate-400 italic text-sm">У вас еще нет команд</p>
                </div>`;
            return;
        }

        listContainer.innerHTML = teams.map(team => `
            <div class="team-item border border-slate-200 rounded-3xl overflow-hidden bg-white mb-3 transition-all duration-300">
                <div onclick="toggleTeamAccordion(this, ${team.id}, '${team.name.replace(/'/g, "\\'")}')"
                     class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                            ${team.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800">${team.name}</h4>
                            <p class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">${team.member_count || 0} участников</p>
                        </div>
                    </div>
                    <svg class="w-5 h-5 text-slate-400 transform transition-transform duration-300 chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
                <div class="team-panel hidden border-t border-slate-50 bg-slate-50/30">
                    <div class="p-5">
                        <div id="members-grid-${team.id}" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <p class="text-center col-span-3 text-slate-400 text-sm animate-pulse">Загрузка состава...</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        showToast("Не удалось загрузить список команд", "error");
    }
}

/**
 * Логика аккордеона
 */
async function toggleTeamAccordion(element, teamId, teamName) {
    const item = element.parentElement;
    const panel = item.querySelector('.team-panel');
    const chevron = item.querySelector('.chevron');
    const isOpening = panel.classList.contains('hidden');

    // Сначала закрываем все открытые панели
    document.querySelectorAll('.team-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.chevron').forEach(c => c.classList.remove('rotate-180'));

    if (isOpening) {
        panel.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        await loadTeamMembers(teamId, teamName, `members-grid-${teamId}`);
    }
}

/**
 * Загрузка участников и структуры вкладок
 */
async function loadTeamMembers(teamId, teamName, gridId) {
    const grid = document.getElementById(gridId);
    const headers = getAuthHeaders();
    const userStr = localStorage.getItem('user');
    
    if (!headers || !userStr) return;
    const currentUser = JSON.parse(userStr);

    try {
        const [teamRes, membersRes] = await Promise.all([
            fetch(`${API_URL}/teams/${teamId}/`, { headers }),
            fetch(`${API_URL}/teams/${teamId}/members/`, { headers })
        ]);

        if (!teamRes.ok || !membersRes.ok) throw new Error("Ошибка API");

        const teamData = await teamRes.json();
        const members = await membersRes.json();
        const isOwnerMe = teamData.owner.id === currentUser.id;

        // Рисуем скелет вкладок
        grid.innerHTML = `
            <div class="col-span-1 md:col-span-3">
                <div class="flex gap-8 border-b border-slate-100 mb-6 px-2">
                    <button onclick="switchTeamTab(${teamId}, 'members', '${teamName.replace(/'/g, "\\'")}')"
                            id="tab-btn-members-${teamId}"
                            class="pb-4 px-1 border-b-2 border-indigo-600 text-indigo-600 font-bold text-sm transition-all">
                        Участники
                    </button>
                    <button onclick="switchTeamTab(${teamId}, 'projects', '${teamName.replace(/'/g, "\\'")}')"
                            id="tab-btn-projects-${teamId}"
                            class="pb-4 px-1 border-b-2 border-transparent text-slate-400 font-bold text-sm transition-all hover:text-slate-600">
                        Проекты
                    </button>
                </div>
                <div id="team-content-area-${teamId}" class="fade-in"></div>
            </div>
        `;

        renderMembersInside(teamId, teamName, teamData.owner, members, isOwnerMe, currentUser.id);
    } catch (err) {
        grid.innerHTML = `<p class="col-span-3 text-center text-red-500 py-4">Ошибка загрузки данных</p>`;
    }
}

async function removeMember(teamId, userId, username, teamName) {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username} из команды?`)) return;

    const token = localStorage.getItem('access'); //

    try {
        const response = await fetch(`${API_URL}/teams/${teamId}/remove-member/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId }) // Бэк обычно ожидает ID удаляемого пользователя
        });

        if (response.ok) {
            showToast(`Пользователь ${username} удален`, "success");
            // Обновляем список участников в текущем интерфейсе
            loadTeamMembers(teamId, teamName, `members-grid-${teamId}`);
        } else {
            const data = await response.json();
            showToast(data.detail || "Ошибка при удалении", "error");
        }
    } catch (err) {
        showToast("Ошибка соединения с сервером", "error");
    }
}

/**
 * Отрисовка списка участников (внутренний контент)
 */
function renderMembersInside(teamId, teamName, owner, members, isOwnerMe, currentUserId) {
    const container = document.getElementById(`team-content-area-${teamId}`);
    if (!container) return;

    // 1. Кнопка чата для владельца
    const ownerChatBtn = owner.id !== currentUserId ? `
        <button onclick="openChatWithUser(${owner.id}, '${owner.username.replace(/'/g, "\\'")}')"
                class="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                title="Написать владельцу">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        </button>
    ` : '';

    const ownerHtml = `
        <div class="p-6 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm mb-4 relative overflow-hidden group">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                <div class="flex items-center gap-5">
                    <div class="relative">
                        <div class="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">
                            ${owner.username[0].toUpperCase()}
                        </div>
                        <div class="absolute -bottom-1 -right-1 bg-white p-1 rounded-lg shadow-sm">👑</div>
                    </div>
                    <div>
                        <p class="text-[10px] text-amber-600 font-black uppercase tracking-[0.2em]">Владелец</p>
                        <p class="font-black text-slate-800 text-xl">${owner.username} ${owner.id === currentUserId ? '<span class="text-amber-500 ml-1">(Вы)</span>' : ''}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${ownerChatBtn}
                    ${isOwnerMe ? `
                        <button onclick="openTeamModal(${teamId}, '${teamName.replace(/'/g, "\\'")}')"
                                class="bg-white border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-100 transition shadow-sm">
                            Настройки команды
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    const inviteHtml = isOwnerMe ? ` ` : ' '; // (оставь как было)

    const otherMembers = members.filter(m => m.user.id !== owner.id);
    const membersHtml = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${otherMembers.map(m => {
                const isMe = m.user.id === currentUserId;
                // Кнопка чата для сокомандников
                const memberChatBtn = !isMe ? `
                    <button onclick="openChatWithUser(${m.user.id}, '${m.user.username.replace(/'/g, "\\'")}')"
                            class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Написать">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                    ` : '';

                return `
                    <div class="relative p-5 rounded-2xl border ${isMe ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-100' : 'border-slate-100 bg-white'} flex items-center justify-between gap-4 group">
                        <div class="flex items-center gap-4">
                            ${isMe ? '<span class="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">ЭТО ВЫ</span>' : ''}
                            <div class="w-12 h-12 ${isMe ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'} rounded-full flex items-center justify-center font-bold">
                                ${m.user.username[0].toUpperCase()}
                            </div>
                            <div>
                                <p class="font-bold ${isMe ? 'text-indigo-900' : 'text-slate-800'}">${m.user.username}</p>
                                <p class="text-xs text-slate-500">${m.role_display}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-1">
                            ${memberChatBtn}
                            ${isOwnerMe && !isMe ? `
                                <button onclick="removeMember(${teamId}, ${m.user.id}, '${m.user.username}', '${teamName.replace(/'/g, "\\'")}')"
                                        class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        title="Удалить участника">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </div>`;
            }).join('')}
        </div>
    `;

    container.innerHTML = ownerHtml + inviteHtml + (otherMembers.length ? membersHtml : '<p class="text-center text-slate-400 text-sm">В команде пока нет других участников</p>');
}

/**
 * Логика приглашения
 */
async function inviteMember(teamId) {
    const input = document.getElementById(`invite-public-id-${teamId}`);
    const headers = getAuthHeaders();
    if (!input || !headers) return;

    const code = input.value.trim().toUpperCase();
    if (!code) return showToast("Введите ID пользователя", "error");

    try {
        const response = await fetch(`${API_URL}/teams/${teamId}/invite-by-dynamic-id/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ dynamic_id: code })
        });

        const data = await response.json();
        if (response.ok) {
            showToast("Участник добавлен!", "success");
            input.value = "";
            loadTeamMembers(teamId, "", `members-grid-${teamId}`);
        } else {
            showToast(data.detail || data.dynamic_id?.[0] || "Ошибка", "error");
        }
    } catch (err) {
        showToast("Ошибка сети", "error");
    }
}

/**
 * Работа с модальным окном (Создание / Редактирование)
 */
function openTeamModal(teamId = null, currentName = "") {
    const modal = document.getElementById('modal-overlay');
    const input = document.getElementById('team-modal-input');
    const title = document.getElementById('modal-title');
    const actionBtn = document.getElementById('modal-action-btn');
    const dangerZone = document.getElementById('modal-danger-zone');

    if (!modal || !input) return;

    modal.classList.remove('hidden');
    input.value = currentName;
    input.focus();

    if (teamId) {
        title.innerText = "Настройки команды";
        actionBtn.innerText = "Сохранить изменения";
        dangerZone?.classList.remove('hidden');

        actionBtn.onclick = () => handleTeamAction(`${API_URL}/teams/${teamId}/`, 'PATCH', { name: input.value.trim() }, "Обновлено!");
        
        const deleteBtn = document.getElementById('delete-team-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                if (confirm("Удалить команду безвозвратно?")) {
                    handleTeamAction(`${API_URL}/teams/${teamId}/`, 'DELETE', null, "Команда удалена");
                }
            };
        }
    } else {
        title.innerText = "Новая команда";
        actionBtn.innerText = "Создать";
        dangerZone?.classList.add('hidden');
        actionBtn.onclick = () => handleTeamAction(`${API_URL}/teams/`, 'POST', { name: input.value.trim() }, "Создано!");
    }
}

async function handleTeamAction(url, method, body, successMsg) {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null
        });

        if (response.ok) {
            showToast(successMsg, "success");
            closeTeamSettings();
            loadTeamsData();
        } else {
            const data = await response.json();
            showToast(data.detail || "Ошибка операции", "error");
        }
    } catch {
        showToast("Ошибка сервера", "error");
    }
}
/**
 * Загрузка проектов команды
 */
async function loadTeamProjects(teamId) {
    const container = document.getElementById(`team-content-area-${teamId}`);
    const headers = getAuthHeaders();
    if (!container || !headers) return;

    // Прелоадер
    container.innerHTML = `
        <div class="col-span-1 md:col-span-3 py-12 text-center">
            <div class="inline-block w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p class="text-slate-400 font-bold text-sm">Загружаем проекты...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/teams/${teamId}/projects/`, { headers });
        if (!response.ok) throw new Error("Ошибка при загрузке проектов");

        const projects = await response.json();
        renderProjectsInside(teamId, projects);
    } catch (err) {
        container.innerHTML = `<p class="text-center text-red-500 py-10 font-bold">Не удалось загрузить проекты</p>`;
    }
}

async function deleteProject(teamId, projectId, projectName) {
    if (!confirm(`Вы уверены, что хотите полностью удалить проект "${projectName}"? Все задачи внутри будут стерты.`)) return;

    const token = localStorage.getItem('access'); //

    try {
        const response = await fetch(`${API_URL}/projects/${projectId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}` //
            }
        });

        if (response.ok) {
            showToast("Проект успешно удален", "success");
            // Обновляем только текущую вкладку проектов
            loadTeamProjects(teamId); //
        } else {
            const data = await response.json();
            showToast(data.detail || "Ошибка при удалении проекта", "error");
        }
    } catch (err) {
        showToast("Ошибка связи с сервером", "error");
    }
}

/**
 * Отрисовка сетки проектов
 */
function renderProjectsInside(teamId, projects) {
    const container = document.getElementById(`team-content-area-${teamId}`);
    if (!container) return;

    const createBtnHtml = `
        <button onclick="openCreateProjectModal(${teamId})"
                class="group p-6 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px]">
            <div class="w-12 h-12 bg-slate-50 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 rounded-2xl flex items-center justify-center transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            </div>
            <span class="font-black text-slate-400 group-hover:text-indigo-600 text-sm uppercase tracking-wider">Новый проект</span>
        </button>
    `;

    const projectsHtml = projects.map(p => `
        <div class="group p-6 rounded-3xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div class="absolute top-4 right-4 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onclick="openEditProjectModal(${teamId}, ${p.id}, '${p.name.replace(/'/g, "\\'")}', '${(p.description || '').replace(/'/g, "\\'").replace(/\n/g, "\\n")}')"
                        class="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Редактировать">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button onclick="deleteProject(${teamId}, ${p.id}, '${p.name.replace(/'/g, "\\'")}')"
                        class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl" title="Удалить">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div class="absolute -right-4 -bottom-4 text-slate-50 opacity-10 group-hover:text-indigo-100 group-hover:opacity-100 transition-all">
                <svg class="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
            </div>

            <div class="relative">
                <div class="flex justify-between items-start mb-4">
                    <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm">📂</div>
                </div>
                <h5 class="font-black text-slate-800 text-lg mb-1 group-hover:text-indigo-600 transition-colors">${p.name}</h5>
                <p class="text-xs text-slate-400 line-clamp-2 mb-4 font-medium">${p.description || 'Без описания'}</p>
            </div>

            <button onclick="openProject(${p.id})"
                    class="relative w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                Открыть доску
            </button>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            ${createBtnHtml}
            ${projectsHtml}
        </div>
    `;
}

/**
 * Открытие модального окна для создания проекта
 */
function openCreateProjectModal(teamId) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const inputName = document.getElementById('team-modal-input'); // Поле названия (существующее)
    const actionBtn = document.getElementById('modal-action-btn');
    const dangerZone = document.getElementById('modal-danger-zone');

    if (!modal || !inputName) return;

    // 1. Настройка базовых полей модалки
    modal.classList.remove('hidden');
    title.innerText = "Создание проекта";
    inputName.value = "";
    inputName.placeholder = "Название (например: Редизайн сайта)";
    actionBtn.innerText = "Создать проект";
    if (dangerZone) dangerZone.classList.add('hidden');

    // 2. Добавляем поле описания, если его еще нет в DOM
    let descInput = document.getElementById('project-desc-modal-input');
    if (!descInput) {
        const descHtml = `
            <div id="project-desc-wrapper" class="mt-4">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Описание проекта</label>
                <textarea id="project-desc-modal-input" rows="3"
                          class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                          placeholder="Краткое описание целей..."></textarea>
            </div>`;
        inputName.insertAdjacentHTML('afterend', descHtml);
        descInput = document.getElementById('project-desc-modal-input');
    } else {
        // Если уже есть, просто показываем его
        document.getElementById('project-desc-wrapper').classList.remove('hidden');
        descInput.value = "";
    }

    // 3. Переопределяем логику кнопки действия
    actionBtn.onclick = async () => {
        const name = inputName.value.trim();
        const description = descInput.value.trim();

        if (!name) return showToast("Укажите название проекта", "error");

        // Используем универсальный обработчик (модифицированный под обновление проектов)
        await handleProjectCreate(`${API_URL}/teams/${teamId}/projects/`, { name, description }, teamId);
    };
}

/**
 * Специализированный обработчик для создания проекта,
 * так как после него нужно обновить именно список проектов, а не команд
 */
async function handleProjectCreate(url, data, teamId) {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast("Проект успешно создан!", "success");
            closeTeamSettings(); // Закрываем модалку и скрываем описание
            loadTeamProjects(teamId); // Перерисовываем вкладку проектов
        } else {
            const errData = await response.json();
            showToast(errData.detail || "Ошибка при создании", "error");
        }
    } catch (err) {
        showToast("Сервер не отвечает", "error");
    }
}

function openProject(projectId) {
    window.location.href = `project.html?id=${projectId}`;
}
function closeTeamSettings() {
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');

    // Скрываем поле описания, чтобы оно не вылезло при создании команды
    const descWrapper = document.getElementById('project-desc-wrapper');
    if (descWrapper) descWrapper.classList.add('hidden');
}

function switchTeamTab(teamId, tab, teamName) {
    // 1. Находим кнопки вкладок именно для этой команды
    const btnMembers = document.getElementById(`tab-btn-members-${teamId}`);
    const btnProjects = document.getElementById(`tab-btn-projects-${teamId}`);

    if (!btnMembers || !btnProjects) return;

    // Стили для активного состояния
    const activeClasses = ['border-indigo-600', 'text-indigo-600'];
    const inactiveClasses = ['border-transparent', 'text-slate-400'];

    // 2. Сбрасываем стили для обеих вкладок
    [btnMembers, btnProjects].forEach(btn => {
        btn.classList.remove(...activeClasses);
        btn.classList.add(...inactiveClasses);
    });

    // 3. Устанавливаем активные стили нужной вкладке и загружаем контент
    if (tab === 'members') {
        btnMembers.classList.remove(...inactiveClasses);
        btnMembers.classList.add(...activeClasses);
        loadTeamMembers(teamId, teamName, `members-grid-${teamId}`);
    } else {
        btnProjects.classList.remove(...inactiveClasses);
        btnProjects.classList.add(...activeClasses);
        loadTeamProjects(teamId);
    }
}

function openEditProjectModal(teamId, projectId, currentName, currentDesc) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const inputName = document.getElementById('team-modal-input');
    const actionBtn = document.getElementById('modal-action-btn');
    const dangerZone = document.getElementById('modal-danger-zone');

    modal.classList.remove('hidden');
    title.innerText = "Редактирование проекта";
    inputName.value = currentName;
    actionBtn.innerText = "Сохранить изменения";
    if (dangerZone) dangerZone.classList.add('hidden');

    // Проверяем/создаем поле описания
    let descInput = document.getElementById('project-desc-modal-input');
    if (!descInput) {
        const descHtml = `
            <div id="project-desc-wrapper" class="mt-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Описание проекта</label>
                <textarea id="project-desc-modal-input" rows="3"
                          class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"></textarea>
            </div>`;
        inputName.insertAdjacentHTML('afterend', descHtml);
        descInput = document.getElementById('project-desc-modal-input');
    } else {
        document.getElementById('project-desc-wrapper').classList.remove('hidden');
    }
    descInput.value = currentDesc;

    actionBtn.onclick = async () => {
        const name = inputName.value.trim();
        const description = descInput.value.trim();

        if (!name) return showToast("Название не может быть пустым", "error");

        try {
            const response = await fetch(`${API_URL}/projects/${projectId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access')}`
                },
                body: JSON.stringify({ name, description })
            });

            if (response.ok) {
                showToast("Проект обновлен!", "success");
                closeTeamSettings();
                loadTeamProjects(teamId); // Перерисовываем список проектов
            } else {
                showToast("Ошибка при сохранении", "error");
            }
        } catch (err) {
            showToast("Сервер не отвечает", "error");
        }
    };
}