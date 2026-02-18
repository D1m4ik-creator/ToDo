from rest_framework import permissions

from .models import TeamMember


class IsTeamOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id


def is_team_owner(user, team) -> bool:
    return team.owner_id == user.id


def is_team_member(user, team) -> bool:
    if is_team_owner(user, team):
        return True
    return TeamMember.objects.filter(
        team=team,
        user=user,
        is_accepted=True,
    ).exists()


def can_manage_members(user, team) -> bool:
    if is_team_owner(user, team):
        return True
    return TeamMember.objects.filter(
        team=team,
        user=user,
        role=TeamMember.Roler.ADMIN,
        is_accepted=True,
    ).exists()
