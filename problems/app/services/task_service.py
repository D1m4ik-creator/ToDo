from django.db import transaction
from app.models import Task, User

@transaction.atomic
def move_task(task: Task, new_status: str, actor):
    if new_status not in Task.Status.values:
        raise ValueError("Недопустимый статус")

    old_status = task.status
    task.status = new_status
    task.save(update_fields=["status", "updated_at"])

    # Хук под будущее
    # from app.services.events import task_status_changed
    # task_status_changed(task, old_status, new_status, actor)

    return task

def send_task_to_review(*, task: Task, actor: User):
    task.send_to_review()