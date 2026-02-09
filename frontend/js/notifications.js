// notifications.js
const Notifications = {
    items: [],
    isOpen: false,

    async init() {
        // Достаем именно access токен, как ты указал
        const token = localStorage.getItem('access');
        const btn = document.getElementById('notifButton');

        if (!token) {
            if (btn) btn.classList.add('hidden');
            return;
        }

        // Если токен есть — показываем кнопку
        if (btn) btn.classList.remove('hidden');

        await this.loadUnread();
        // Опрос сервера раз в 30 секунд
        setInterval(() => this.loadUnread(), 30000);
    },

    // Вспомогательный метод для заголовков
    getHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('access')}`,
            'Content-Type': 'application/json'
        };
    },

    async loadUnread() {
        try {
            // Используем API_URL из твоего config.js
            const response = await fetch(`${API_URL}/notifications/unread/`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.ok) {
                this.items = await response.json();
                this.updateUI();
            } else if (response.status === 401) {
                // Если токен протух, скрываем кнопку
                document.getElementById('notifButton').classList.add('hidden');
            }
        } catch (err) {
            console.error("Ошибка загрузки уведомлений:", err);
        }
    },

    updateUI() {
        const badge = document.getElementById('notifBadge');
        const count = this.items.length;

        if (count > 0) {
            badge.innerText = count;
            badge.className = "absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center";
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

        if (this.isOpen) this.renderModal();
    },

    toggleModal() {
        this.isOpen = !this.isOpen;
        this.renderModal();
    },

    renderModal() {
        let container = document.getElementById('notif-modal-container');

        if (!this.isOpen) {
            if (container) container.classList.add('hidden');
            return;
        }

        if (!container) {
            container = document.createElement('div');
            container.id = 'notif-modal-container';
            document.body.appendChild(container);
        }

        container.className = "fixed inset-0 z-[60] flex justify-end p-4 pointer-events-none";
        container.classList.remove('hidden');

        container.innerHTML = `
            <div class="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-slide-in">
                <div class="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-lg text-slate-800">Уведомления</h3>
                    <button onclick="Notifications.toggleModal()" class="text-slate-400 hover:text-slate-600 transition">✕</button>
                </div>
                <div class="overflow-y-auto max-h-[400px] p-4 space-y-3" id="notif-list-content">
                    ${this.items.length === 0 ? '<p class="text-center text-slate-400 py-8">Нет новых уведомлений</p>' : ''}
                </div>
            </div>
        `;

        const listContent = document.getElementById('notif-list-content');
        this.items.forEach(item => {
            const div = document.createElement('div');
            div.className = "p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all";
            let actionButtons = '';
            if (item.type === 'team_invite') {
                const teamId = item.payload.team_id;
                actionButtons = `
                    <div class="flex gap-2 mt-3">
                        <button onclick="Notifications.handleInvite(${teamId}, 'accept', ${item.id})"
                                class="flex-1 bg-indigo-600 text-white text-xs py-2 rounded-xl font-bold hover:bg-indigo-700 transition">Принять</button>
                        <button onclick="Notifications.handleInvite(${teamId}, 'decline', ${item.id})"
                                class="flex-1 bg-slate-200 text-slate-600 text-xs py-2 rounded-xl font-bold hover:bg-slate-300 transition">Отклонить</button>
                    </div>
                `;
            } else {
                actionButtons = `
                    <button onclick="Notifications.markAsRead(${item.id})" class="mt-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline">Прочитано</button>
                `;
            }

            div.innerHTML = `
                <p class="text-sm text-slate-700">${this.formatMessage(item)}</p>
                ${actionButtons}
            `;
            listContent.appendChild(div);
        });
    },

    formatMessage(item) {
        if (item.type === 'team_invite') return `Вас пригласили в команду <span class="font-bold text-indigo-600">${item.payload.team_name}</span>`;
        if (item.type === 'task_assigned') return `Новая задача: <span class="font-bold">${item.payload.task_title}</span>`;
        if (item.type === 'invite_accepted') return `Приглашение принято <span class="font-bold text-indigo-600">${item.payload.username}</span>-ом в команду <span class="font-bold">${item.payload.team_name}</span>`;
        if (item.type === 'invite_declined') return `Приглашение отклонено <span class="font-bold text-indigo-600">${item.payload.username}</span>-ом в команду <span class="font-bold">${item.payload.team_name}</span>`;
        return "У вас новое уведомление";
    },

    async handleInvite(inviteId, action, notifId) { // Переименовали для ясности
        try {
            // Теперь URL будет правильным: /api/team-invites/42/accept/
            const response = await fetch(`${API_URL}/team-invites/${inviteId}/${action}/`, {
                method: 'POST',
                headers: this.getHeaders()
            });

            if (response.ok) {
                await this.markAsRead(notifId);
                if (typeof showToast === 'function')
                    showToast(action === 'accept' ? "Вы вступили в команду" : "Приглашение отклонено", "success");

                if (action === 'accept') {
                    // Небольшая задержка перед релоадом, чтобы пользователь успел увидеть тост
                    setTimeout(() => location.reload(), 1000);
                }
            } else {
                const data = await response.json();
                if (typeof showToast === 'function') showToast(data.detail || "Ошибка", "error");
            }
        } catch (err) {
            console.error("Действие не удалось", err);
        }
    },

    async markAsRead(id) {
        try {
            const response = await fetch(`${API_URL}/notifications/${id}/read/`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            if (response.ok) {
                this.items = this.items.filter(item => item.id !== id);
                this.updateUI();
            }
        } catch (err) {
            console.error("Не удалось пометить уведомление", err);
        }
    }
};