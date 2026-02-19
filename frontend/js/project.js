/**************************************************
 * GLOBAL STATE
 **************************************************/
let currentProjectId = null;


/**************************************************
 * INIT
 **************************************************/
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentProjectId = params.get('id');

    if (!currentProjectId) {
        window.location.href = 'index.html';
        return;
    }

    initBoard();
    initGlobalEvents();
});

async function initBoard() {
    try {
        await loadProject();
        await loadTasks();
    } catch (err) {
        showToast(getApiErrorMessage(err, "Не удалось загрузить проект"), "error");
    }
}

function initGlobalEvents() {
    // Закрытие по клику вне формы
    document.addEventListener('click', (event) => {
        const statuses = ['todo', 'progress', 'review', 'done'];

        statuses.forEach(status => {
            const form = document.getElementById(`inline-form-${status}`);
            const btn = document.getElementById(`btn-${status}`);
            const input = document.getElementById(`input-${status}`);

            if (form && !form.classList.contains('hidden')) {
                // Если клик не по форме и не по кнопке открытия
                if (!form.contains(event.target) && !btn.contains(event.target)) {
                    form.classList.add('hidden');
                    // Возвращаем кнопку только если это был клик "отмены" (клиент сам наведет мышь, чтобы увидеть её снова)
                    // Но для удобства можно вернуть видимость, если курсор остался над колонкой.
                    // В данном случае лучше просто скрыть форму. Кнопка появится при событии mouseenter (hover).
                    if (input) input.value = '';

                    // Хак: Если мышь прямо сейчас над этой колонкой, кнопка должна быть видна.
                    // Но проще довериться CSS hover логике: скрыли форму -> кнопки нет -> юзер дернул мышью -> кнопка появилась.
                    // Если хотите, чтобы кнопка появлялась сразу при закрытии кликом вне:
                    // btn.classList.remove('hidden');
                    // (Оставляю закомментированным, чтобы соблюсти ваше требование "только в текущей")
                }
            }
        });
    });

    // Закрытие по Esc
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const statuses = ['todo', 'progress', 'review', 'done'];
            statuses.forEach(status => {
                const form = document.getElementById(`inline-form-${status}`);
                const btn = document.getElementById(`btn-${status}`);
                const input = document.getElementById(`input-${status}`);

                if (form && !form.classList.contains('hidden')) {
                    form.classList.add('hidden');
                    // btn.classList.remove('hidden'); // Тоже убираем, чтобы не мелькали
                    if (input) input.value = '';
                }
            });
            closeModal();
        }
    });
}


/**************************************************
 * PROJECT + TEAM
 **************************************************/
async function loadProject() {
    const project = await apiClient.get(`/projects/${currentProjectId}/`);

    document.getElementById('project-name').innerText = project.name;

    if (project.team) {
        const teamId = typeof project.team === 'object' ? project.team.id : project.team;
        await loadTeamMembers(teamId);
    }
}

async function loadTeamMembers(teamId) {
    const members = await apiClient.get(`/teams/${teamId}/members/`);

    const select = document.getElementById('edit-assignee');
    const header = document.getElementById('project-members-list');

    if (select) select.innerHTML = `<option value="">Не назначен</option>`;
    if (header) header.innerHTML = '';

    members.forEach(m => {
        if (select) {
            const opt = document.createElement('option');
            opt.value = m.user.id;
            opt.textContent = m.user.username;
            select.appendChild(opt);
        }

        if (header) {
            const avatar = document.createElement('div');
            avatar.className = "w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold";
            avatar.textContent = m.user.username[0].toUpperCase();
            avatar.title = m.user.username;
            header.appendChild(avatar);
        }
    });
}


/**************************************************
 * TASKS
 **************************************************/
async function loadTasks() {
    const tasks = await apiClient.get(`/tasks/?project_id=${currentProjectId}`);

    const counters = { todo: 0, progress: 0, review: 0, done: 0 };

    Object.keys(counters).forEach(status => {
        const col = document.getElementById(`col-${status}`);
        if (col) col.innerHTML = renderLoader("Загрузка...");
        const count = document.getElementById(`count-${status}`);
        if (count) count.innerText = '0';
    });

    Object.keys(counters).forEach(status => {
        const col = document.getElementById(`col-${status}`);
        if (col) col.innerHTML = '';
    });

    tasks.forEach(task => {
        if (counters[task.status] !== undefined) {
            counters[task.status]++;
            document.getElementById(`col-${task.status}`)
                .insertAdjacentHTML('beforeend', renderTask(task));
        }
    });

    Object.keys(counters).forEach(s => {
        const el = document.getElementById(`count-${s}`);
        if (el) el.innerText = counters[s];
    });

    if (tasks.length === 0) {
        const todoCol = document.getElementById("col-todo");
        if (todoCol) {
            todoCol.innerHTML = renderEmptyState("В проекте пока нет задач");
        }
    }
}

function renderTask(task) {
    const initial = task.assigned_to_username
        ? task.assigned_to_username[0].toUpperCase()
        : '?';

    return `
    <div draggable="true"
         data-id="${task.id}"
         ondragstart="onDrag(event)"
         class="bg-white p-2 rounded-lg border hover:border-indigo-300 cursor-grab relative group shadow-sm">

        <button onclick="openEdit(${task.id})"
                class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600">
            ⋮
        </button>

        <span class="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase text-slate-500">
            ${task.priority_display || task.priority}
        </span>

        <h4 class="text-xs font-semibold mt-1 text-slate-700">${task.title}</h4>

        ${task.assigned_to_username ? `
            <div class="flex items-center gap-1 mt-2 text-[9px] text-slate-400">
                <div class="w-4 h-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                    ${initial}
                </div>
                ${task.assigned_to_username}
            </div>` : ''}
    </div>`;
}


/**************************************************
 * DRAG & DROP
 **************************************************/
function onDrag(ev) {
    ev.dataTransfer.setData("taskId", ev.target.dataset.id);
}

async function onDrop(ev, status) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("taskId");

    try {
        await apiClient.patch(`/tasks/${id}/move/`, { status });
    } catch (err) {
        showToast(getApiErrorMessage(err, "Не удалось переместить задачу"), "error");
    }

    loadTasks();
}

function allowDrop(ev) {
    ev.preventDefault();
}

function highlightCol(status) {
    document.getElementById(`container-${status}`).classList.add('bg-slate-200');
}

function unhighlightCol(status) {
    document.getElementById(`container-${status}`).classList.remove('bg-slate-200');
}


/**************************************************
 * INLINE FORMS (Быстрое создание)
 **************************************************/
function toggleInlineForm(status) {
    const form = document.getElementById(`inline-form-${status}`);
    const btn = document.getElementById(`btn-${status}`);
    const input = document.getElementById(`input-${status}`);

    // Закрываем другие формы, но НЕ трогаем их кнопки (пусть hover разбирается)
    ['todo', 'progress', 'review', 'done'].forEach(s => {
        if (s !== status) {
            const otherForm = document.getElementById(`inline-form-${s}`);
            if (!otherForm.classList.contains('hidden')) {
                otherForm.classList.add('hidden');
                // document.getElementById(`btn-${s}`).classList.remove('hidden'); // УБРАЛИ ЭТУ СТРОКУ
            }
        }
    });

    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        btn.classList.add('hidden');
        input.focus();
    } else {
        form.classList.add('hidden');
        btn.classList.remove('hidden');
    }
}

async function quickCreate(status) {
    const input = document.getElementById(`input-${status}`);
    const title = input.value.trim();

    if (!title) return;

    const payload = {
        title: title,
        project: currentProjectId,
        status: status,
        priority: 'medium'
    };

    try {
        await apiClient.post(`/tasks/`, payload);

        input.value = '';
        // Скрываем форму, восстанавливаем кнопку
        document.getElementById(`inline-form-${status}`).classList.add('hidden');
        document.getElementById(`btn-${status}`).classList.remove('hidden');

        loadTasks();
    } catch (e) {
        showToast(getApiErrorMessage(e, 'Ошибка при создании задачи'), "error");
    }
}


/**************************************************
 * MODAL
 **************************************************/
function openCreateTask() {
    resetModal();
    document.getElementById('edit-task-id').value = '';
    document.getElementById('modal-title').innerText = 'Новая задача';
    document.getElementById('delete-btn').classList.add('hidden');
    openModal();
}

async function openEdit(id) {
    const task = await apiClient.get(`/tasks/${id}/`);

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-desc').value = task.description || '';
    document.getElementById('edit-priority').value = task.priority;
    document.getElementById('edit-assignee').value = task.assigned_to || "";

    document.getElementById('modal-title').innerText = 'Редактирование';
    document.getElementById('delete-btn').classList.remove('hidden');

    openModal();
}

async function saveTask() {
    const id = document.getElementById('edit-task-id').value;

    const titleVal = document.getElementById('edit-title').value;
    const descVal = document.getElementById('edit-desc').value;
    const priorityVal = document.getElementById('edit-priority').value;
    const assigneeVal = document.getElementById('edit-assignee').value;

    const payload = {
        title: titleVal.trim(),
        description: descVal.trim(),
        priority: priorityVal,
        assigned_to: assigneeVal || null,
        project: currentProjectId,
        ...(id ? {} : { status: 'todo' })
    };

    if (!payload.title) {
        alert("Введите название задачи");
        return;
    }

    try {
        if (id) {
            await apiClient.patch(`/tasks/${id}/`, payload);
        } else {
            await apiClient.post(`/tasks/`, payload);
        }
        closeModal();
        loadTasks();
    } catch (err) {
        showToast(getApiErrorMessage(err, "Не удалось сохранить задачу"), "error");
    }
}

async function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    if (!confirm("Удалить задачу?")) return;

    try {
        await apiClient.delete(`/tasks/${id}/`);
        closeModal();
        loadTasks();
    } catch (err) {
        showToast(getApiErrorMessage(err, "Не удалось удалить задачу"), "error");
    }
}


/**************************************************
 * MODAL UTILS
 **************************************************/
function openModal() {
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('task-modal').classList.add('hidden');
    resetModal();
}

function resetModal() {
    document.getElementById('edit-task-id').value = '';
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-desc').value = '';
    document.getElementById('edit-priority').value = 'medium';
    document.getElementById('edit-assignee').value = '';
    document.getElementById('delete-btn').classList.add('hidden');
}
