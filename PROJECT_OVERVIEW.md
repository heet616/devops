# HealthTech Microservices Demo

## Purpose
This repository is a small, production-style demo that shows how to:
- ingest patient vitals through an API,
- analyze them for alert conditions,
- stream alerts to a simple dashboard feed,
- run everything in containers with monitoring,
- deploy the stack to a low-cost EC2 instance,
- validate code quality in CI with tests and SonarCloud.

The overall theme is a health-tech telemetry pipeline, built with three FastAPI services, Prometheus metrics, and a Jenkins CI/CD pipeline.

## High-Level Architecture
- Ingestion Service: receives vitals and forwards them to Analysis.
- Analysis Service: evaluates alert rules and sends alerts to Dashboard.
- Dashboard Service: receives alerts and streams them to clients via server-sent events (SSE).
- Observability: Prometheus scrapes metrics from each service. Grafana visualizes them.
- CI/CD: Jenkins runs tests, scans with SonarCloud, and deploys the stack via Docker Compose.
- Infra: Terraform provisions an EC2 instance and security group on AWS.

## Services and Responsibilities

### Ingestion Service (FastAPI)
- Endpoint: `POST /api/v1/vitals`
- Validates incoming vitals payloads with Pydantic.
- Forwards the payload to the Analysis Service using HTTP.
- Exposes `GET /metrics` for Prometheus.

Key behavior:
- Any HTTP failure while contacting Analysis results in a 502 response.

### Analysis Service (FastAPI)
- Endpoint: `POST /analyze`
- Applies simple rule checks to detect abnormal vitals:
  - heart rate > 120 -> `heart_rate_high`
  - heart rate < 50 -> `heart_rate_low`
  - SpO2 < 90 -> `spo2_low`
- When a rule is triggered, creates an alert with a UUID and sends it to the Dashboard Service.
- Exposes `GET /metrics` for Prometheus.

Key behavior:
- If no rule triggers, the response is `{ "status": "ok", "alert": false }`.
- If Dashboard communication fails, it returns a 502 error.

### Dashboard Service (FastAPI)
- Endpoint: `POST /alerts` to receive alerts from Analysis.
- Endpoint: `GET /stream` streams alerts to clients using SSE.
- Holds alerts in an in-memory asyncio queue.
- Exposes `GET /metrics` for Prometheus.

Key behavior:
- Each connected SSE client receives alerts as they arrive.
- Alerts are not persisted; they exist only in memory.

## Data Flow
1. Client posts vitals to Ingestion (`/api/v1/vitals`).
2. Ingestion forwards the payload to Analysis (`/analyze`).
3. Analysis evaluates rules and, if triggered, posts an alert to Dashboard (`/alerts`).
4. Dashboard publishes alerts to any client connected to `/stream`.

## Observability
- Each service exports Prometheus metrics:
  - request count with labels: service, method, path, status_code
  - request latency histogram
- Prometheus is configured to scrape all three services at 15-second intervals.
- Grafana is included for dashboards (data source is Prometheus).

## CI/CD Pipeline (Jenkins)
The Jenkins pipeline performs:
1. Checkout
2. Test: installs dependencies and runs `pytest`
3. SonarCloud scan and quality gate
4. Deploy: runs `docker compose up -d --build`

The pipeline expects:
- a SonarCloud token stored in Jenkins as `SONAR_TOKEN`.
- project key and organization in both Jenkinsfile and `sonar-project.properties`.

## Containerization and Runtime
- One Dockerfile builds a base Python image and runs any service based on the `SERVICE` env var.
- Docker Compose spins up:
  - Ingestion, Analysis, Dashboard services
  - Jenkins
  - Prometheus
  - Grafana

Memory limits are set per container to keep the stack small for free-tier usage.

## Infrastructure (Terraform)
Terraform provisions:
- an Ubuntu 22.04 EC2 instance
- a security group opening ports:
  - 22 (SSH)
  - 80 (Ingestion API)
  - 8080 (Jenkins)
  - 3000 (Grafana)
- user_data to install Docker, Docker Compose plugin, and a 2 GB swap file

Outputs:
- EC2 public IP and public DNS

## Configuration Files and What They Control
- `docker-compose.yml`: defines the runtime stack and service wiring.
- `Dockerfile`: builds the Python runtime and selects the service to run.
- `prometheus.yml`: tells Prometheus where to scrape metrics.
- `requirements.txt`: Python dependencies for the services and tests.
- `Jenkinsfile`: pipeline for test, quality gate, and deployment.
- `sonar-project.properties`: SonarCloud configuration.
- `infra/*.tf`: Terraform configuration for AWS resources.

## Testing
- Unit tests validate the Analysis rule engine.
- Tests call `evaluate_rules` directly to check each alert trigger.

## Limitations and Design Notes
- Alerts are stored only in memory (no database).
- No authentication or authorization is implemented.
- Services rely on internal container networking; URLs are configured via env vars.
- The ruleset is intentionally small for demo purposes.
- This is a demo stack; it is not hardened for production.

## How to Run (Summary)
- Local: `docker compose up -d --build`
- AWS: Provision EC2 with Terraform, then run Docker Compose on the instance.

For step-by-step setup and usage, see SETUP.md.
