import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import ChatRoom, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        self.other_user_id = self.scope["url_route"]["kwargs"]["user_id"]
        room_data = await self.get_room_data()
        self.room_id = room_data['id']
        self.room_name = f"chat_{self.room_id}"

        print(f"User {self.user} joined group {self.room_name}")
        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )

        await self.accept()

    @sync_to_async
    def get_room_data(self):
        # Логика определения ID (с поддержкой анонимов для тестов)
        my_id = self.user.id if self.user.is_authenticated else 1  # Заглушка
        other_id = int(self.other_user_id)

        user1, user2 = sorted([my_id, other_id])
        room, _ = ChatRoom.objects.get_or_create(
            user1_id=user1,
            user2_id=user2
        )
        return {'id': room.id}

    # Получение сообщений
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_text = data["message"]

        message = await self.save_message(message_text)

        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "chat_message",
                "message": message.text,
                "sender": self.user.username if self.user.is_authenticated else "Аноним",
                "created_at": message.created_at.isoformat(),
            }
        )

    # Отправка сообщения клиентам
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event))

    # Закрытие соединения
    async def disconnect(self, close_code):
        if hasattr(self, 'room_name'):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)

    @sync_to_async
    def get_room_name(self):
        current_user_id = self.user.id if self.user.is_authenticated else 5
        other_id = int(self.other_user_id)

        user1, user2 = sorted([current_user_id, other_id])

        # Убеждаемся, что оба пользователя существуют перед созданием комнаты
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if not User.objects.filter(id__in=[user1, user2]).count() == 2:
            # Здесь можно бросить исключение или обработать ошибку
            return "temp_room_for_errors"

        room, _ = ChatRoom.objects.get_or_create(
            user1_id=user1,
            user2_id=user2
        )
        return f"chat_{room.id}"

    @sync_to_async
    def save_message(self, text):
        from django.contrib.auth import get_user_model
        sender = self.user if self.user.is_authenticated else get_user_model().objects.first()

        return Message.objects.create(
            room_id=self.room_id,
            sender=self.user,
            text=text
        )