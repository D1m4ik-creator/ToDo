from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

def login_user(email: str, password: str):
    user = authenticate(email=email, password=password)
    if not user:
        raise ValueError("Неверные учетные данные")

    refresh = RefreshToken.for_user(user)
    return {
        "user": user,
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token)
        }
    }

def logout_user(refresh_token):
    token = RefreshToken(refresh_token)
    token.blacklist()  # Добавляем в чёрный список