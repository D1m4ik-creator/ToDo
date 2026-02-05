from django.db import transaction
from django.core.exceptions import PermissionDenied
from app.models import TeamMember

from app.services.events import NotificationService


@transaction.atomic
def create_member(self ,serializer):
    team = serializer.save(owner=self.request.user)

    TeamMember.objects.create(
        team=team,
        user=self.request.user,
        role="owner"
    )

@transaction.atomic()
def delete_member(self, request):
    user_id = request.data.get("user_id")
    team = self.get_object()
    member = TeamMember.objects.filter(team=team, user__id=user_id)
    member.delete()

class TeamInviteService:

    @staticmethod
    @transaction.atomic
    def accept(user, team):
        member = TeamMember.objects.select_for_update().filter(
            team=team,
            user=user,
            is_accepted=False
        ).first()

        if not member:
            return PermissionDenied("Нет активного приглашения")

        member.is_accepted = True
        member.save(update_fields=["is_accepted"])
        NotificationService.invite_accepted(team=team, invited_user=user)
        return member

    @staticmethod
    @transaction.atomic
    def decline(user, team):
        member = TeamMember.objects.select_for_update().filter(
            team=team,
            invited_user=user,
            is_accepted=False
        ).first()

        if not member:
            return PermissionDenied("Нет активного приглашения")

        member.delete()
        NotificationService.invite_declined(team=team, user=user)