FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

FROM base AS builder

COPY requirements.txt /app/requirements.txt
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /app/requirements.txt

FROM base AS runtime

ENV PATH="/opt/venv/bin:$PATH"
ARG SERVICE
ENV SERVICE=${SERVICE}

COPY --from=builder /opt/venv /opt/venv
COPY ingestion_service /app/ingestion_service
COPY analysis_service /app/analysis_service
COPY dashboard_service /app/dashboard_service

CMD ["sh", "-c", "uvicorn ${SERVICE}.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
