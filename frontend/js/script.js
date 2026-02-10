let chatSocket = null;
let lastMessageDate = null;

window.openChatWithUser = function(userId, username) {
    const token = localStorage.getItem('access'); // Ключ из твоего teams.js
    const popup = document.getElementById('chat-popup');
    const messagesDiv = document.getElementById('chat-messages');

    if (chatSocket) chatSocket.close();

    lastMessageDate = null; // Сбрасываем при открытии нового чата
    document.getElementById('chat-target-name').innerText = username;
    document.getElementById('chat-avatar').innerText = username[0].toUpperCase();
    messagesDiv.innerHTML = '<div class="text-center py-10 opacity-50 text-xs uppercase font-black tracking-widest">Загрузка истории...</div>';
    popup.classList.remove('hidden');

    chatSocket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${userId}/?token=${token}`);

    chatSocket.onmessage = (e) => {
        const data = JSON.parse(e.data);

        if (data.type === 'chat_history') {
            messagesDiv.innerHTML = '';
            data.messages.forEach(msg => appendMessageUI(msg));
        }
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
            chatSocket.send(JSON.stringify({ message: text }));
            input.value = '';
        }
    };
    sendBtn.onclick = sendMessage;
    input.onkeydown = (e) => { if(e.key === 'Enter') sendMessage(); };
};

/**
 * Отрисовка сообщения в списке
 */
function appendMessageUI(data) {
    const messagesDiv = document.getElementById('chat-messages');

    const msgDate = new Date(data.created_at);
    const dateString = msgDate.toLocaleDateString(); // Формат "DD.MM.YYYY"
    // Если день изменился — вставляем разделитель
    if (dateString !== lastMessageDate) {
        messagesDiv.insertAdjacentHTML('beforeend', `
            <div class="flex justify-center my-4">
                <span class="bg-slate-200 text-slate-500 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tighter">
                    ${formatDateLabel(msgDate)}
                </span>
            </div>
        `);
        lastMessageDate = dateString;
    }
    // Определяем, мы ли отправили это сообщение
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isMe = data.sender === currentUser?.username;
    const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgHtml = `
            <div class="flex ${isMe ? 'justify-end' : 'justify-start'} mb-3">
                <div class="relative max-w-[85%] px-4 py-2 text-sm shadow-sm
                    ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none'}">
                    ${!isMe ? `<p class="text-[9px] font-black opacity-50 mb-1 uppercase">${data.sender}</p>` : ''}
                    <p class="pr-7 leading-relaxed">${data.message}</p>
                    <span class="absolute bottom-1 right-2 text-[8px] opacity-60 font-bold">${time}</span>
                </div>
            </div>
        `;

    messagesDiv.insertAdjacentHTML('beforeend', msgHtml);

    // Авто-скролл вниз
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatDateLabel(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toLocaleDateString() === today.toLocaleDateString()) return "Сегодня";
    if (date.toLocaleDateString() === yesterday.toLocaleDateString()) return "Вчера";

    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/**
 * Закрытие окна чата
 */
window.closeChat = function() {
    if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
    }
    document.getElementById('chat-popup').classList.add('hidden');
};