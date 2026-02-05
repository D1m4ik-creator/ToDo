from django.db import models
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.contrib.auth import authenticate

from .services.team_service import create_member, delete_member, TeamInviteService
from .services.auth_service import logout_user, GoogleAuthService
from .services.task_service import move_task, send_task_to_review
from .serializers import *
from .service import get_or_create_dynamic_id
from .models import Team, TeamMember, Projects, Task


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Возвращаем данные текущего пользователя")
    def get(self, request):
        dynamic_id = get_or_create_dynamic_id(request.user)

        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "public_id": dynamic_id
        })

class GoogleAuthAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]

        user, tokens = GoogleAuthService.register_or_login_google(
            google_token=token,
            client_id=settings.GOOGLE_AUTH_CLIENT_ID
        )

        return Response(
            {
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "display_name": user.get_full_name() or user.username,
                },
                "tokens": tokens,
            },
            status=status.HTTP_200_OK
        )



class RegistrationAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Регистрация нового пользователя",
        description="Принимает данные пользователя, создает аккаунт и возвращает JWT токены.",
        request=UserRegisterSerializer,
        responses={
            201: OpenApiResponse(
                description="Успешная регистрация",
                response=UserSerializer  # Можно указать схему ответа
            ),
            400: OpenApiResponse(description="Ошибка валидации данных")
        },
        tags=["Аутентификация"]  # Группирует эндпоинты в интерфейсе
    )
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)

            return Response({
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Авторизация пользователя",
        description="Принимает данные пользователя и возвращает JWT токены.",
        request=UserSerializer,
        responses={
            201: OpenApiResponse(
                description="Успешная аутентификация",
            ),
            400: OpenApiResponse(description="Ошибка валидации данных")
        },
        tags=["Аутентификация"]  # Группирует эндпоинты в интерфейсе
    )
    def post(self, request):
        data = request.data
        email = data.get("email", None)
        username = data.get('username', None)
        password = data.get('password', None)

        if email is None or password is None:
            return Response({'error': 'Нужен и логин, и пароль'}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(request, email=email, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                "user": UserSerializer(user).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }, status=status.HTTP_200_OK)

        return Response({"detail": "Неверные учетные данные"}, status=status.HTTP_401_UNAUTHORIZED)


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Выход из системы (отзыв токена)",
        description="Принимает refresh токен и заносит его в черный список. После этого токен станет недействительным.",
        request=LogoutSerializer,
        responses={
            205: OpenApiResponse(description="Успешный выход, токен отозван"),
            400: OpenApiResponse(description="Неверный или просроченный токен"),
            401: OpenApiResponse(description="Пользователь не авторизован")
        },
        tags=["Аутентификация"]
    )

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Необходим Refresh token'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            logout_user(refresh_token)
        except TokenError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': 'Выход успешен'}, status=status.HTTP_200_OK)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Team.objects.filter(
        models.Q(owner=user) | models.Q(teammember__user=user)
    ).distinct()

    def perform_create(self, serializer):
        create_member(self , serializer)

    @extend_schema(request=TeamMemberCreateSerializer, responses={201: None})
    @action(detail=True, methods=["post"], url_path='invite-by-dynamic-id')
    def invite_by_dynamic_id(self, request, pk=None):
        team = self.get_object()

        serializer = TeamMemberCreateSerializer(
            data=request.data,
            context={'team': team, 'request': request}
        )

        if serializer.is_valid():
            team_member = serializer.save()


            from .tasks import send_team_invite_notification
            print(team_member)
            send_team_invite_notification(
                invited_user_id=team_member
                .user.id,
                team_id=team.id,
                inviter_id=request.user.id
            )

            return Response({"detail": "Приглашение успешно отправлено"}, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(request=TeamMemberSerializer, responses={201: None})
    @action(detail=True, methods=["get"], url_path="members")
    def members(self, request, pk=None):
        team = self.get_object()
        members = TeamMember.objects.filter(team=team).select_related()
        serializer = TeamMemberSerializer(members, many=True)
        return Response(serializer.data)

    @extend_schema(responses={204: None})
    @action(detail=True, methods=["delete"], url_path='remove-member')
    def remove_member(self, request, pk=None):
        try:
            member = delete_member(self, request)
        except TeamMember.DoesNotExist as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        return Response({"detail": "Член команды спешно удалён"}, status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=ProjectsSerializers, responses={201: None})
    @action(detail=True, methods=["get", "post"], url_path="projects")
    def projects(self, requests, pk=None):
        team = self.get_object()

        if requests.method == "GET":
            projects = team.projects.all().order_by("-created_at")
            serializer = ProjectsSerializers(projects, many=True)
            return Response(serializer.data)

        if requests.method == "POST":
            serializer = ProjectsSerializers(data=requests.data)
            if serializer.is_valid():
                serializer.save(team=team)
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get("project_id")

        queryset = Task.objects.filter(project__team__members=user).distinct()
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by("-priority", "-created_at")

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"], url_path="send-to-review")
    def send_to_review(self, request, pk=None):
        task = self.get_object()

        try:
            send_task_to_review(task=task, actor=request.user)
            return Response({'detail': 'Задача отправлена на проверку', 'status': task.status})

        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["patch"], url_path="move")
    def move_task(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get("status")

        try:
            move_task(task, new_status, request.user)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'status': task.status})

class ProjectsViewSet(viewsets.ModelViewSet):
    queryset = Projects.objects.all()
    serializer_class = ProjectsSerializers
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Projects.objects.filter(team__members=self.request.user).distinct()


class NotificationsViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationsSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="unread")
    def unread(self, request):
        qs = self.get_queryset().filter(is_read=False)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"statis": "ok"})


class TeamInviteActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, team_id, action):
        team = Team.objects.get(id=team_id)
        if action == "accept":
            TeamInviteService.accept(
                user=request.user,
                team=team
            )

        elif action == "decline":
            TeamInviteService.decline(
                user=request.user,
                team=team
            )

        else:
            return Response({"detail": "Invalid action"}, status=400)

        return Response({"status": "ok"})
