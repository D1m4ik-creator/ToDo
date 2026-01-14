let currentProjectId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');

    if (!currentProjectId) {
        window.location.href = 'index.html';
        return;
    }
    initProjectBoard();
});

async function initProjectBoard() {
    await loadProjectInfo();
    await loadTasks();
}

// 1. Загрузка информации о проекте и УЧАСТНИКАХ
async function loadProjectInfo() {
    const token = localStorage.getItem('access');
    try {
        console.log(`Загрузка данных проекта: ${currentProjectId}`);
        const projRes = await fetch(`${API_URL}/projects/${currentProjectId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!projRes.ok) throw new Error("Проект не найден");

        const project = await projRes.json();
        document.getElementById('project-name').innerText = project.name;

        // ВАЖНО: Проверяем, пришла ли команда
        console.log("Данные проекта:", project);

        if (project.team) {
            console.log("ID команды найден:", project.team);
            // Если project.team это объект, берем .id, если число/строка - используем как есть
            const teamId = typeof project.team === 'object' ? project.team.id : project.team;
            await loadTeamMembersForSelect(teamId);
        } else {
            console.warn("У проекта не назначена команда (поле team пустое)");
        }
    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast("Ошибка загрузки данных проекта", "error");
    }
}

// 2. Загрузка участников в Select (для модалки) и в шапку
async function loadTeamMembersForSelect(teamId) {
    const token = localStorage.getItem('access');
    try {
        const response = await fetch(`${API_URL}/teams/${teamId}/members/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Не удалось загрузить участников");

        const members = await response.json();
        console.log("Участники команды:", members);

        const select = document.getElementById('edit-assignee');
        const membersListHeader = document.getElementById('project-members-list');

        // Очистка и дефолтное значение
        if (select) select.innerHTML = '<option value="">Не назначен</option>';
        if (membersListHeader) membersListHeader.innerHTML = '';

        members.forEach(m => {
            // 1. Добавляем в выпадающий список (Модалка)
            if (select) {
                const option = document.createElement('option');
                option.value = m.user.id; // ID пользователя
                option.innerText = m.user.username; // Имя пользователя
                select.appendChild(option);
            }

            // 2. Добавляем кружочки в шапку (Header)
            if (membersListHeader) {
                const avatar = document.createElement('div');
                avatar.className = "w-6 h-6 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm cursor-help";
                avatar.innerText = m.user.username[0].toUpperCase();
                avatar.title = m.user.username;
                membersListHeader.appendChild(avatar);
            }
        });
    } catch (err) {
        console.error("Ошибка загрузки участников:", err);
    }
}

// 3. Загрузка задач
async function loadTasks() {
    const token = localStorage.getItem('access');
    try {
        const response = await fetch(`${API_URL}/tasks/?project_id=${currentProjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasks = await response.json();

        const counts = { todo: 0, progress: 0, review: 0, done: 0 };

        // Очистка колонок
        Object.keys(counts).forEach(status => {
            const col = document.getElementById(`col-${status}`);
            const counter = document.getElementById(`count-${status}`);
            if (col) col.innerHTML = '';
            if (counter) counter.innerText = '0';
        });

        tasks.forEach(task => {
            if (counts.hasOwnProperty(task.status)) {
                counts[task.status]++;
                const col = document.getElementById(`col-${task.status}`);
                if (col) col.insertAdjacentHTML('beforeend', createTaskCardHTML(task));
            }
        });

        // Обновление счетчиков
        Object.keys(counts).forEach(key => {
            const counter = document.getElementById(`count-${key}`);
            if (counter) counter.innerText = counts[key];
        });
    } catch (err) { console.error(err); }
}

// 4. Генерация миниатюрной карточки
function createTaskCardHTML(task) {
    // Безопасное получение первой буквы исполнителя
    const assigneeInitial = task.assigned_to_username ? task.assigned_to_username[0].toUpperCase() : '?';

    return `
        <div class="bg-white px-2 py-2 rounded-lg shadow-sm border border-slate-100 hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group relative"
             draggable="true"
             ondragstart="drag(event, ${task.id})"
             data-task-id="${task.id}">

            <button onclick="event.stopPropagation(); openEditModal(${task.id})"
                    class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-50 rounded transition-all text-slate-400">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>

            <div class="mb-1 flex items-center gap-1">
                <span class="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 font-bold uppercase text-slate-500 border border-slate-200">
                    ${task.priority_display || task.priority}
                </span>
            </div>

            <h4 class="font-semibold text-slate-800 text-[11px] leading-tight pr-4 mb-2">${task.title}</h4>

            ${task.assigned_to_username ? `
                <div class="flex items-center gap-1.5 border-t border-slate-50 pt-1.5">
                    <div class="w-4 h-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[8px] font-bold">
                        ${assigneeInitial}
                    </div>
                    <span class="text-[9px] text-slate-400 font-medium truncate max-w-[80px]">${task.assigned_to_username}</span>
                </div>
            ` : ''}
        </div>
    `;
}

// --- DRAG AND DROP ---
function allowDrop(ev) { ev.preventDefault(); }

function drag(ev, taskId) {
    ev.dataTransfer.setData("taskId", taskId);
    ev.currentTarget.classList.add('opacity-50', 'scale-95');
}

async function drop(ev, newStatus) {
    ev.preventDefault();
    unhighlightCol(newStatus);
    const taskId = ev.dataTransfer.getData("taskId");
    const card = document.querySelector(`[data-task-id="${taskId}"]`);

    if (card) {
        document.getElementById(`col-${newStatus}`).appendChild(card);
        card.classList.remove('opacity-50', 'scale-95');
    }

    try {
        await fetch(`${API_URL}/tasks/${taskId}/move/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        loadTasks();
    } catch (err) { console.error(err); }
}

// --- МОДАЛЬНОЕ ОКНО ---
function openCreateTaskModal() {
    const modal = document.getElementById('task-modal');
    const content = document.getElementById('task-modal-content');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-btn');

    document.getElementById('edit-task-id').value = '';
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-desc').value = '';
    document.getElementById('edit-priority').value = 'medium';
    document.getElementById('edit-assignee').value = ''; // Сброс исполнителя

    modalTitle.innerText = 'Новая задача';
    deleteBtn.classList.add('hidden');

    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('edit-title').focus(), 50);
}

async function openEditModal(taskId) {
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-btn');

    try {
        const res = await fetch(`${API_URL}/tasks/${taskId}/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
        });
        const task = await res.json();

        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-title').value = task.title;
        document.getElementById('edit-desc').value = task.description || '';
        document.getElementById('edit-priority').value = task.priority;

        // Установка исполнителя (если он есть)
        document.getElementById('edit-assignee').value = task.assigned_to || '';

        modalTitle.innerText = 'Редактировать';
        deleteBtn.classList.remove('hidden');
        modal.classList.remove('hidden');
    } catch (err) { console.error(err); }
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
}

async function saveTaskUpdate() {
    const id = document.getElementById('edit-task-id').value;
    const method = id ? 'PATCH' : 'POST';
    const url = id ? `${API_URL}/tasks/${id}/` : `${API_URL}/tasks/`;

    const payload = {
        title: document.getElementById('edit-title').value,
        description: document.getElementById('edit-desc').value,
        priority: document.getElementById('edit-priority').value,
        assigned_to: document.getElementById('edit-assignee').value || null,
        project: currentProjectId
    };

    if (!id) payload.status = 'todo'; // Для новых задач

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeTaskModal();
            loadTasks();
            if (typeof showToast === 'function') showToast(id ? "Обновлено" : "Создано", "success");
        }
    } catch (err) { console.error(err); }
}

async function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    if (!confirm("Удалить задачу?")) return;

    try {
        await fetch(`${API_URL}/tasks/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access')}` }
        });
        closeTaskModal();
        loadTasks();
    } catch (err) { console.error(err); }
}

// --- UX HELPERS ---
function toggleInlineForm(status) {
    const form = document.getElementById(`inline-form-${status}`);
    const btn = document.getElementById(`btn-${status}`);
    if (form) form.classList.toggle('hidden');
    if (btn) btn.classList.toggle('hidden');
    if (form && !form.classList.contains('hidden')) {
        const input = document.getElementById(`input-${status}`);
        if(input) input.focus();
    }
}

async function quickCreate(status) {
    const input = document.getElementById(`input-${status}`);
    const title = input.value.trim();
    if (!title) return;

    try {
        const res = await fetch(`${API_URL}/tasks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            },
            body: JSON.stringify({ title, status, project: currentProjectId })
        });
        if (res.ok) {
            input.value = '';
            toggleInlineForm(status);
            loadTasks();
        }
    } catch (err) { console.error(err); }
}

function highlightCol(status) {
    const el = document.getElementById(`container-${status}`);
    if (el) el.classList.add('bg-indigo-50/80', 'border-indigo-300');
}

function unhighlightCol(status) {
    const el = document.getElementById(`container-${status}`);
    if (el) el.classList.remove('bg-indigo-50/80', 'border-indigo-300');
}

// --- UI EVENT HANDLERS ---
window.showColumnButton = (status) => {
    const isTouch = window.matchMedia("(hover: none)").matches;
    if (!isTouch) {
        const btn = document.getElementById(`btn-${status}`);
        const form = document.getElementById(`inline-form-${status}`);
        if (btn && form.classList.contains('hidden')) btn.classList.remove('hidden');
    }
}

window.hideColumnButton = (status) => {
    const isTouch = window.matchMedia("(hover: none)").matches;
    if (!isTouch) {
        const btn = document.getElementById(`btn-${status}`);
        const form = document.getElementById(`inline-form-${status}`);
        if (btn && form.classList.contains('hidden')) btn.classList.add('hidden');
    }
}
