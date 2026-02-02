from app.models import Notification

class NotificationService:

    @staticmethod
    def team_invite(invited_user, team, inviter):
        return Notification.objects.create(
            user=invited_user,
            type=Notification.Type.TEAM_INVITE,
            payload={
                "team_id": team.id,
                "team_name": team.name,
                "inviter_id": inviter.id,
                "inviter_name": inviter.username,
            }
        )

    @staticmethod
    def invite_accepted(team, invited_user):
        return Notification.objects.create(
            user=team.owner,
            type=Notification.Type.INVITE_ACCEPTED,
            payload = {
                "team_id": team.id,
                "team_name": team.name,
                "user_id": invited_user.id,
                "username": invited_user.username,
            }
        )

    @staticmethod
    def invite_declined(team, invited_user):
        return Notification.objects.create(
            user=team.owner,
            type=Notification.Type.INVITE_DECLINED,
            payload = {
                "team_id": team.id,
                "team_name": team.name,
                "user_id": invited_user.id,
                "username": invited_user.username,
            }
        )

    @staticmethod
    def task_assigned(task, assigned_user):
        return Notification.objects.create(
            user=assigned_user,
            type=Notification.Type.TASK_ASSIGNED,
            payload={
                "task_id": task.id,
                "task_title": task.title,
                "project_id": task.project_id,
            }
        )
