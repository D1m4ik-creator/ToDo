import json
import re
import requests
from typing import Any
from django.conf import settings
from app.models import Task


class OpenRouterServiceError(Exception):
    pass


class OpenRouterTaskGenerator:
    @staticmethod
    def _build_prompt(project_name: str, project_description: str, tasks_count: int) -> list[dict[str, str]]:
        system_prompt = (
            "Ты опытный project manager. "
            "Сгенерируй практичные задачи для проекта. "
            "Отвечай ТОЛЬКО валидным JSON без markdown. "
            'Формат: {"tasks":[{"title":"...","description":"...","priority":"low|medium|high|urgently"}]}.'
        )
        user_prompt = (
            f"Название проекта: {project_name}\n"
            f"Описание проекта: {project_description or 'Описание не задано'}\n"
            f"Количество задач: {tasks_count}\n\n"
            "Правила:\n"
            "1) Заголовок задачи короткий и конкретный.\n"
            "2) Описание задачи в 1-3 предложениях.\n"
            "3) Набор задач должен покрывать анализ, реализацию, тестирование, релиз.\n"
            "4) Не добавляй объяснения вне JSON."
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    @staticmethod
    def _extract_json(content: str) -> dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
            cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            payload = json.loads(cleaned)
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise OpenRouterServiceError("Модель вернула невалидный JSON.")

        try:
            payload = json.loads(match.group(0))
            if isinstance(payload, dict):
                return payload
        except json.JSONDecodeError as exc:
            raise OpenRouterServiceError("Не удалось распарсить JSON из ответа модели.") from exc

        raise OpenRouterServiceError("Неверный формат JSON в ответе модели.")

    @staticmethod
    def _normalize_tasks(raw_tasks: list[dict[str, Any]]) -> list[dict[str, str]]:
        normalized: list[dict[str, str]] = []
        allowed_priority = set(Task.Priority.values)

        for item in raw_tasks:
            if not isinstance(item, dict):
                continue

            title = str(item.get("title", "")).strip()
            if not title:
                continue
            title = title[:128]

            description = str(item.get("description", "")).strip()
            priority = str(item.get("priority", Task.Priority.MEDIUM)).strip().lower()
            if priority not in allowed_priority:
                priority = Task.Priority.MEDIUM

            normalized.append(
                {
                    "title": title,
                    "description": description,
                    "priority": priority,
                }
            )

        if not normalized:
            raise OpenRouterServiceError("Модель не вернула валидных задач.")

        return normalized

    @classmethod
    def generate_tasks_from_project(
        cls,
        *,
        project_name: str,
        project_description: str,
        tasks_count: int | None = None,
        model: str | None = None,
    ) -> list[dict[str, str]]:
        if not settings.OPENROUTER_API_KEY:
            raise OpenRouterServiceError("OPENROUTER_API_KEY не задан.")

        requested_count = tasks_count or settings.AI_DEFAULT_TASKS_COUNT
        requested_count = max(1, min(requested_count, 60))

        selected_model = model or settings.OPENROUTER_DEFAULT_MODEL
        messages = cls._build_prompt(project_name, project_description, requested_count)

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.OPENROUTER_HTTP_REFERER,
            "X-Title": settings.OPENROUTER_X_TITLE,
        }
        payload = {
            "model": selected_model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": settings.OPENROUTER_MAX_OUTPUT_TOKENS,
            "response_format": {"type": "json_object"},
        }

        try:
            response = requests.post(
                settings.OPENROUTER_BASE_URL,
                headers=headers,
                json=payload,
                timeout=settings.OPENROUTER_REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise OpenRouterServiceError("Ошибка сети при запросе к OpenRouter.") from exc

        if response.status_code >= 400:
            detail = response.text[:500]
            raise OpenRouterServiceError(
                f"OpenRouter вернул ошибку {response.status_code}: {detail}"
            )

        data = response.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not content:
            raise OpenRouterServiceError("Пустой ответ от модели.")

        parsed = cls._extract_json(content)
        tasks = parsed.get("tasks")
        if not isinstance(tasks, list):
            raise OpenRouterServiceError("Ожидался JSON формата {'tasks': [...]}.")

        return cls._normalize_tasks(tasks)
