let socket = null;
const token = localStorage.getItem('access');

// Элементы управления
const connectBtn = document.getElementById("connectBtn");
const targetUserIdInput = document.getElementById("targetUserId");
const chatWindow = document.getElementById("chatWindow");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");

connectBtn.onclick = function() {
    const targetId = targetUserIdInput.value.trim();
    
    if (!targetId || !token) {
        alert("Введите ID и убедитесь, что вы авторизованы!");
        return;
    }

    // Если уже есть открытое соединение — закрываем его
    if (socket) {
        socket.close();
        messagesDiv.innerHTML = ""; // Очищаем историю старого чата
    }

    startChat(targetId);
};

function startChat(userId) {
    // Формируем URL с токеном
    socket = new WebSocket(
        `ws://127.0.0.1:8000/ws/chat/${userId}/?token=${token}`
    );

    socket.onopen = function() {
        console.log(`Подключено к чату с пользователем ${userId}`);
        chatWindow.style.display = "block";
        chatHeader.innerText = `Чат с пользователем ID: ${userId}`;
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        addMessage(data.sender, data.message);
    };

    socket.onclose = function() {
        console.log("Соединение закрыто");
    };

    socket.onerror = function(error) {
        console.error("Ошибка сокета:", error);
        alert("Не удалось подключиться. Проверьте ID пользователя.");
    };
}

// Функции sendMessage и addMessage остаются такими же, как были
function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (text && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ message: text }));
        input.value = "";
    }
}

function addMessage(sender, text) {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Привязываем отправку
document.getElementById("sendBtn").onclick = sendMessage;