from django.db import transaction

from app.models import Projects, Task
from app.services.openrouter_service import OpenRouterTaskGenerator


@transaction.atomic
def generate_ai_tasks_for_project(project: Projects, tasks_count: int | None = None) -> list[Task]:
    generated = OpenRouterTaskGenerator.generate_tasks_from_project(
        project_name=project.name,
        project_description=project.description,
        tasks_count=tasks_count,
    )

    tasks = [
        Task(
            title=item["title"],
            description=item["description"],
            priority=item["priority"],
            status=Task.Status.TODO,
            project=project,
        )
        for item in generated
    ]
    Task.objects.bulk_create(tasks)
    return list(Task.objects.filter(project=project).order_by("-created_at")[: len(tasks)])
