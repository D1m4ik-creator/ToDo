let chatSocket = null;
let lastMessageDate = null;

/**
 * Открытие чата
 */
window.openChatWithUser = function(userId, username) {
    const token = localStorage.getItem('access');
    const popup = document.getElementById('chat-popup');
    const messagesDiv = document.getElementById('chat-messages');

    if (chatSocket) chatSocket.close();

    lastMessageDate = null;
    document.getElementById('chat-target-name').innerText = username;
    document.getElementById('chat-avatar').innerText = username[0].toUpperCase();
    messagesDiv.innerHTML = '<div class="text-center py-10 opacity-50 text-[10px] font-black uppercase tracking-widest">Загрузка истории...</div>';
    popup.classList.remove('hidden');

    chatSocket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${userId}/?token=${token}`);

    chatSocket.onmessage = (e) => {
        const data = JSON.parse(e.data);

        // 1. Обработка удаления (скрываем элемент из списка)
        if (data.type === 'chat_message_deleted') {
            const el = document.getElementById(`msg-container-${data.message_id}`);
            if (el) {
                el.classList.add('opacity-0', 'scale-95');
                setTimeout(() => el.remove(), 300);
            }
            return;
        }

        // 2. Загрузка истории
        if (data.type === 'chat_history') {
            messagesDiv.innerHTML = '';
            data.messages.forEach(msg => appendMessageUI(msg));
        }

        // 3. Новое сообщение
        else if (data.type === 'chat_message') {
            appendMessageUI(data);
        }
    };

    // Логика отправки
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    const sendMessage = () => {
        const text = input.value.trim();
        if (text && chatSocket?.readyState === WebSocket.OPEN) {
            chatSocket.send(JSON.stringify({ "message": text }));
            input.value = '';
        }
    };

    sendBtn.onclick = sendMessage;
    input.onkeydown = (e) => { if(e.key === 'Enter') sendMessage(); };
};

/**
 * Отрисовка сообщения
 */
function appendMessageUI(data) {
    const messagesDiv = document.getElementById('chat-messages');

    // Работа с разделителями дат
    const msgDate = new Date(data.created_at);
    const dateString = msgDate.toLocaleDateString();

    if (dateString !== lastMessageDate) {
        messagesDiv.insertAdjacentHTML('beforeend', `
            <div class="flex justify-center my-4">
                <span class="bg-slate-100 text-slate-400 text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-tighter">
                    ${formatDateLabel(msgDate)}
                </span>
            </div>
        `);
        lastMessageDate = dateString;
    }

    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isMe = data.sender === currentUser?.username;
    const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // HTML Сообщения (Стиль Indigo/Slate)
    const msgHtml = `
        <div id="msg-container-${data.id}" class="flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 group/msg transition-all duration-300">
            <div class="relative max-w-[85%] px-4 py-2 text-sm shadow-sm
                ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none'}">

                ${!isMe ? `<p class="text-[9px] font-black opacity-50 mb-1 uppercase tracking-tighter">${data.sender}</p>` : ''}

                <p class="leading-relaxed pr-7 break-words whitespace-pre-wrap">${data.message}</p>

                <span class="absolute bottom-1 right-2 text-[8px] opacity-60 font-bold">${time}</span>

                ${isMe ? `
                    <button onclick="requestDelete(${data.id})"
                            class="absolute -left-8 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all"
                            title="Удалить">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    messagesDiv.insertAdjacentHTML('beforeend', msgHtml);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Запрос удаления
 */
window.requestDelete = function(messageId) {
    if (chatSocket && confirm("Удалить сообщение?")) {
        chatSocket.send(JSON.stringify({
            "action": "delete",
            "message_id": messageId
        }));
    }
};

function formatDateLabel(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toLocaleDateString() === today.toLocaleDateString()) return "Сегодня";
    if (date.toLocaleDateString() === yesterday.toLocaleDateString()) return "Вчера";
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

window.closeChat = function() {
    if (chatSocket) chatSocket.close();
    document.getElementById('chat-popup').classList.add('hidden');
};