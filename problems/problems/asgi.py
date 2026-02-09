import os
from WS.routing import websocket_urlpatterns
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from WS.middleware import JWTAuthMiddleware


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'problems.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})