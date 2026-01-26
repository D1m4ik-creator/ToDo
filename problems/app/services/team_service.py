from django.db import transaction
from app.models import TeamMember

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