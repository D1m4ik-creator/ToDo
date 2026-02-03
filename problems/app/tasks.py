from celery import shared_task
from app.services.events import NotificationService
from app.models import Team
from django.contrib.auth import get_user_model

User = get_user_model()


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=5,
    retry_kwargs={"max_retries": 3}
)
def send_team_invite_notification(self, invited_user_id, team_id, inviter_id):
    invited_user = User.objects.get(id=invited_user_id)
    team = Team.objects.get(id=team_id)
    inviter = User.objects.get(id=inviter_id)
    NotificationService.team_invite(
        invited_user=invited_user,
        team=team,
        inviter=inviter
    )
