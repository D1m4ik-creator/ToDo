from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-$n&mtawz=5qxkw$s(0fvj!^t&a6_piyzhk0*_p9liflc7-i1n('

DEBUG = True
GOOGLE_AUTH_CLIENT_ID = os.environ.get("CLIENT_ID")
ALLOWED_HOSTS = ["127.0.0.1", "0.0.0.0", "localhost"]
CORS_ALLOW_ALL_ORIGINS = True
AUTH_USER_MODEL = "app.User"

INSTALLED_APPS = [
    'django.contrib.admin',
    'daphne',
    "channels",
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework_simplejwt',
    "rest_framework",
    "app",
    'drf_spectacular',
    'rest_framework_simplejwt.token_blacklist',
    "WS",
    "corsheaders",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = 'problems.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'problems.wsgi.application'

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "tododb",
        "USER": "postgres",
        "PASSWORD": "L7062006v.",
        "HOST": "localhost",
        "PORT": "5432",
        'OPTIONS': {
            'client_encoding': 'UTF8',
        },
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Europe/Moscow'

USE_I18N = True

USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Task Management API',
    'DESCRIPTION': 'API для управления проектами и задачами с AI-помощником',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",  # номер базы Redis (1)
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}

# OpenRouter AI settings
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1/chat/completions",
)
OPENROUTER_MODEL_CANDIDATES = [
    model.strip()
    for model in os.getenv(
        "OPENROUTER_MODEL_CANDIDATES",
        "deepseek/deepseek-r1-0528",
    ).split(",")
    if model.strip()
]
OPENROUTER_DEFAULT_MODEL = (
    OPENROUTER_MODEL_CANDIDATES[0]
    if OPENROUTER_MODEL_CANDIDATES
    else "deepseek/deepseek-r1"
)
OPENROUTER_MAX_OUTPUT_TOKENS = int(os.getenv("OPENROUTER_MAX_OUTPUT_TOKENS", "4096"))
OPENROUTER_REQUEST_TIMEOUT = int(os.getenv("OPENROUTER_REQUEST_TIMEOUT", "30"))
OPENROUTER_HTTP_REFERER = os.getenv("OPENROUTER_HTTP_REFERER", "http://localhost:5000")
OPENROUTER_X_TITLE = os.getenv("OPENROUTER_X_TITLE", "ToDo")
AI_DEFAULT_TASKS_COUNT = int(os.getenv("AI_DEFAULT_TASKS_COUNT", "10"))


CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = 'Europe/Moscow'
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True

ASGI_APPLICATION = "problems.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
