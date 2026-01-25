/**************************************************
 * GLOBAL STATE
 **************************************************/
let currentProjectId = null;
const token = () => localStorage.getItem('access');


/**************************************************
 * API HELPER
 **************************************************/
async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token()}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }

    return response;
}


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
});

async function initBoard() {
    await loadProject();
    await loadTasks();
}


/**************************************************
 * PROJECT + TEAM
 **************************************************/
async function loadProject() {
    const res = await apiFetch(`${API_URL}/projects/${currentProjectId}/`);
    const project = await res.json();

    document.getElementById('project-name').innerText = project.name;

    if (project.team) {
        const teamId = typeof project.team === 'object' ? project.team.id : project.team;
        await loadTeamMembers(teamId);
    }
}

async function loadTeamMembers(teamId) {
    const res = await apiFetch(`${API_URL}/teams/${teamId}/members/`);
    const members = await res.json();

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
    const res = await apiFetch(`${API_URL}/tasks/?project_id=${currentProjectId}`);
    const tasks = await res.json();

    const counters = { todo: 0, progress: 0, review: 0, done: 0 };

    Object.keys(counters).forEach(status => {
        document.getElementById(`col-${status}`).innerHTML = '';
        document.getElementById(`count-${status}`).innerText = '0';
    });

    tasks.forEach(task => {
        counters[task.status]++;
        document.getElementById(`col-${task.status}`)
            .insertAdjacentHTML('beforeend', renderTask(task));
    });

    Object.keys(counters).forEach(s => {
        document.getElementById(`count-${s}`).innerText = counters[s];
    });
}

function renderTask(task) {
    const initial = task.assigned_to_username
        ? task.assigned_to_username[0].toUpperCase()
        : '?';

    return `
    <div draggable="true"
         data-id="${task.id}"
         ondragstart="onDrag(event)"
         class="bg-white p-2 rounded-lg border hover:border-indigo-300 cursor-grab relative group">

        <button onclick="openEdit(${task.id})"
                class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400">
            ⋮
        </button>

        <span class="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold uppercase">
            ${task.priority_display || task.priority}
        </span>

        <h4 class="text-xs font-semibold mt-1">${task.title}</h4>

        ${task.assigned_to_username ? `
            <div class="flex items-center gap-1 mt-2 text-[9px] text-slate-400">
                <div class="w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center font-bold">
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

    await apiFetch(`${API_URL}/tasks/${id}/move/`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });

    loadTasks();
}

function allowDrop(ev) {
    ev.preventDefault();
}


/**************************************************
 * MODAL
 **************************************************/
function openCreateTask() {
    resetModal();
    document.getElementById('modal-title').innerText = 'Новая задача';
    openModal();
}

async function openEdit(id) {
    const res = await apiFetch(`${API_URL}/tasks/${id}/`);
    const task = await res.json();

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-desc').value = task.description || '';
    document.getElementById('edit-priority').value = task.priority;
    document.getElementById('edit-assignee').value = task.assigned_to || '';

    document.getElementById('modal-title').innerText = 'Редактирование';
    document.getElementById('delete-btn').classList.remove('hidden');

    openModal();
}

async function saveTask() {
    const id = document.getElementById('edit-task-id').value;

    const payload = {
        title: editTitle.value,
        description: editDesc.value,
        priority: editPriority.value,
        assigned_to: editAssignee.value || null,
        project: currentProjectId,
        ...(id ? {} : { status: 'todo' })
    };

    await apiFetch(
        id ? `${API_URL}/tasks/${id}/` : `${API_URL}/tasks/`,
        { method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
    );

    closeModal();
    loadTasks();
}

async function deleteTask() {
    const id = document.getElementById('edit-task-id').value;
    if (!confirm("Удалить задачу?")) return;

    await apiFetch(`${API_URL}/tasks/${id}/`, { method: 'DELETE' });
    closeModal();
    loadTasks();
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
