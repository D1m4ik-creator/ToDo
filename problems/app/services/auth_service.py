from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.exceptions import ValidationError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests, Response
from django.db import transaction


User = get_user_model()


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


class GoogleAuthService:

    @staticmethod
    def get_tokens_user(user):
        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

    @staticmethod
    @transaction.atomic
    def register_or_login_google(google_token: str, client_id: str):
        try:
            idinfo = id_token.verify_oauth2_token(
                google_token,
                google_requests.Request(),
                client_id
            )
        except ValueError:
            raise ValidationError("Неверный Google-токен")

        email = idinfo.get("email")
        email_verified = idinfo.get("email_verified", False)

        if not email or not email_verified:
            raise ValidationError("Email не подтверждён Google")

        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": GoogleAuthService._generate_username(email),
                "first_name": first_name,
                "last_name": last_name,
            }
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        else:
            # Обновляем данные при повторном входе
            updated = False
            if first_name and user.first_name != first_name:
                user.first_name = first_name
                updated = True
            if last_name and user.last_name != last_name:
                user.last_name = last_name
                updated = True
            if updated:
                user.save(update_fields=["first_name", "last_name"])

        tokens = GoogleAuthService.get_tokens_user(user)
        return user, tokens

    @staticmethod
    def _generate_username(email: str) -> str:
        base = email.split("@")[0]
        username = base
        counter = 1

        while User.objects.filter(username=username).exists():
            username = f"{base}_{counter}"
            counter += 1

        return username