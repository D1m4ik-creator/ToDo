FROM python:3.12-slim

WORKDIR /frontend
COPY . .

EXPOSE 5000

ENTRYPOINT ["python", "-m", "http.server", "5000"]
