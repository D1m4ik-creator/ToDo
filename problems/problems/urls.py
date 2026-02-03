from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView
)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from app.views import *

router = DefaultRouter()
router.register(r"teams", TeamViewSet)
router.register(r"tasks", TaskViewSet)
router.register(r"projects", ProjectsViewSet)
router.register(r"notifications", NotificationsViewSet, basename="notifications")

urlpatterns = [
    path('admin/', admin.site.urls),
    # Работа с командой и тасками
    path("api/", include(router.urls)),
    # Токены для авторизации SimpleJWT и кастомной регистрации
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path("api/register/", RegistrationAPIView.as_view(), name="register"), # Регистрация
    path("api/login/", LoginAPIView.as_view(), name="login"),# Вход
    path("api/logout/", LogoutAPIView.as_view(), name="logout"), # Выход
    # Google auth
    path("api/auth/google/callback/", GoogleAuthAPIView.as_view(), name="google"),
    # Возвращаем данные текущего пользователя
    path("api/auth/me/", MeView.as_view(), name="me"),

    # Приглашение или отклонение в команду
    path("api/team-invites/<int:pk>/accept/", TeamInviteActionView.as_view(), name='team-invite-accept'),
    path("api/team-invites/<int:pk>/decline/", TeamInviteActionView.as_view(), name='team-invite-decline'),

    # Чтение уведомления
    # Документация
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
