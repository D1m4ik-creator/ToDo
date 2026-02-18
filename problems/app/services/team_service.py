from django.db import transaction
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from app.models import TeamMember
from app.permissions import can_manage_members

from app.services.events import NotificationService


@transaction.atomic
def create_member(self, serializer):
    team = serializer.save(owner=self.request.user)

    TeamMember.objects.create(
        team=team,
        user=self.request.user,
        role=TeamMember.Roler.ADMIN,
        is_accepted=True,
    )

@transaction.atomic
def delete_member(self, request):
    user_id = request.data.get("user_id")
    if not user_id:
        raise ValidationError({"errors": {"user_id": ["Поле user_id обязательно."]}})

    team = self.get_object()
    if not can_manage_members(request.user, team):
        raise PermissionDenied("Недостаточно прав для удаления участника.")

    if int(user_id) == team.owner_id:
        raise ValidationError({"errors": {"user_id": ["Нельзя удалить владельца команды."]}})

    member = TeamMember.objects.filter(team=team, user_id=user_id).first()
    if not member:
        raise NotFound("Участник не найден.")

    member.delete()
    return member

class TeamInviteService:

    @staticmethod
    @transaction.atomic
    def accept(user, team):
        member = TeamMember.objects.filter(user=user, team=team).first()
        if member and member.is_accepted:
            raise ValidationError("Пользователь уже состоит в команде.")
        if member and not member.is_accepted:
            member.is_accepted = True
            member.save(update_fields=["is_accepted"])
            NotificationService.invite_accepted(team=team, invited_user=user)
            return member

        member = TeamMember.objects.create(user=user, team=team, role=TeamMember.Roler.MEMBER, is_accepted=True)
        NotificationService.invite_accepted(team=team, invited_user=user)
        return member

    @staticmethod
    @transaction.atomic
    def decline(user, team):
        member = TeamMember.objects.select_for_update().filter(
            team=team,
            user=user,
            is_accepted=False
        ).first()

        if not member:
            raise PermissionDenied("Нет активного приглашения")

        member.delete()
        NotificationService.invite_declined(team=team, invited_user=user)
