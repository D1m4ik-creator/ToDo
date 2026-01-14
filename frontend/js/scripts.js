async function loadTeamsData() {
    const listContainer = document.getElementById('teams-list-scroll');
    const token = localStorage.getItem('access');
    try {
        const response = await fetch(`${API_URL}/teams/`, { headers: { 'Authorization': `Bearer ${token}` } });
        const teams = await response.json();

        if (teams.length === 0) {
            listContainer.innerHTML = `<div class="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p class="text-slate-400 italic text-sm">У вас еще нет команд</p></div>`;
            return;
        }

        listContainer.innerHTML = teams.map(team => `
            <div onclick="loadTeamMembers(${team.id}, '${team.name}')" class="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-500 hover:shadow-md transition cursor-pointer flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-slate-800 group-hover:text-indigo-600 transition">${team.name}</h4>
                    <p class="text-xs text-slate-400">Участников: ${team.member_count || 0}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        listContainer.innerHTML = `<p class="text-red-500 text-sm">Ошибка загрузки</p>`;
    }
}