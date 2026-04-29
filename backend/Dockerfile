FROM python:3.12-slim

# Avoid interactive prompts
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps for pandas / numpy / lxml
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc g++ libpq-dev curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Render / Fly inject PORT; default to 8000 for local builds
ENV PORT=8000
EXPOSE 8000

# Healthcheck — backend exposes /api/status
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/status" || exit 1

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT}"]
