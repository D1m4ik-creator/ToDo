async function refreshToken() {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return false;

    const res = await fetch(`${API_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh })
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem("access", data.access);
    return true;
}

function logout() {
    localStorage.clear();
    window.location.href = "/login.html";
}

async function authFetch(url, options = {}) {
    let access = localStorage.getItem("access");

    options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${access}`,
        "Content-Type": "application/json",
    };

    let response = await fetch(url, options);

    if (response.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
            logout();
            throw new Error("Session expired");
        }

        access = localStorage.getItem("access");
        options.headers.Authorization = `Bearer ${access}`;
        response = await fetch(url, options);
    }

    return response;
}

function renderTeamsTab(container) {
    container.innerHTML = `
        <div class="fade-in">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-black text-slate-800">Мои команды</h3>
                <button onclick="openTeamModal()" class="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition">
                    Создать команду
                </button>
            </div>
            <div id="teams-list-scroll" class="space-y-2"></div>
        </div>
    `;
    loadTeamsData();
}

async function loadTeamsData() {
    const list = document.getElementById('teams-list-scroll');

    try {
        const res = await authFetch(`${API_URL}/teams/`);
        const teams = await res.json();

        if (!teams.length) {
            list.innerHTML = `<p class="text-center text-slate-400">У вас нет команд</p>`;
            return;
        }

        list.innerHTML = teams.map(team => `
            <div class="border rounded-2xl bg-white">
                <div onclick="toggleTeamAccordion(this, ${team.id}, '${team.name.replace(/'/g, "\\'")}')"
                     class="p-4 flex justify-between cursor-pointer">
                    <div>
                        <p class="font-bold">${team.name}</p>
                        <p class="text-xs text-slate-400">${team.member_count || 0} участников</p>
                    </div>
                    <span class="chevron">⌄</span>
                </div>
                <div class="team-panel hidden p-4 bg-slate-50" id="panel-${team.id}">
                    <div id="team-content-area-${team.id}">
                        <p class="text-slate-400 text-sm">Загрузка...</p>
                    </div>
                </div>
            </div>
        `).join('');
    } catch {
        showToast("Ошибка загрузки команд", "error");
    }
}

async function toggleTeamAccordion(el, teamId, teamName) {
    document.querySelectorAll('.team-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`panel-${teamId}`);
    panel.classList.remove('hidden');
    await loadTeamMembers(teamId, teamName);
}

async function loadTeamMembers(teamId, teamName) {
    const container = document.getElementById(`team-content-area-${teamId}`);
    const currentUser = JSON.parse(localStorage.getItem("user"));

    try {
        const [teamRes, membersRes] = await Promise.all([
            authFetch(`${API_URL}/teams/${teamId}/`),
            authFetch(`${API_URL}/teams/${teamId}/members/`)
        ]);

        const team = await teamRes.json();
        const members = await membersRes.json();

        renderMembersInside(
            teamId,
            teamName,
            team.owner,
            members,
            team.owner.id === currentUser.id,
            currentUser.id
        );
    } catch {
        container.innerHTML = `<p class="text-red-500">Ошибка загрузки</p>`;
    }
}

async function inviteMember(teamId) {
    const input = document.getElementById(`invite-public-id-${teamId}`);
    const code = input.value.trim();

    if (!code) return showToast("Введите код", "error");

    try {
        const res = await authFetch(`${API_URL}/teams/${teamId}/invite-by-dynamic-id/`, {
            method: "POST",
            body: JSON.stringify({ dynamic_id: code })
        });

        if (!res.ok) {
            const err = await res.json();
            return showToast(err.detail || "Ошибка", "error");
        }

        showToast("Участник приглашён", "success");
        loadTeamMembers(teamId);
    } catch {
        showToast("Ошибка сети", "error");
    }
}
