FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn httpx pydantic prometheus_client
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir fastapi uvicorn pydantic prometheus_client

# Copy source code
COPY . .

# Expose port 8003 and run uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]