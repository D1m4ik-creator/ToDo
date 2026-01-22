from django.db import transaction

@transaction.atomic
def create(serializer):
    team = serializer.save(owner=self.request.user)

    TeamMember.objects.create(
        team=team,
        user=self.request.user,
        role="owner"
    )