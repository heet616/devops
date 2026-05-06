# HealthTech Microservices Demo Setup

## Prerequisites

- AWS account with Free Tier access
- Terraform >= 1.5
- Docker and Docker Compose (local dev)
- Git

## Repository Layout

- `ingestion_service/` FastAPI ingestion
- `analysis_service/` FastAPI analysis
- `dashboard_service/` FastAPI dashboard
- `infra/` Terraform for EC2
- `docker-compose.yml` runtime stack
- `prometheus.yml` Prometheus config
- `Jenkinsfile` CI/CD pipeline

## 1) Provision the EC2 Instance (Terraform)

1. Create an EC2 key pair and note the key name.
2. From the `infra/` directory:

```bash
terraform init
terraform apply -var="key_name=YOUR_KEYPAIR_NAME"
```

3. Capture the public IP from Terraform output.

## 2) Connect to the Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP
```

## 3) Clone the Repo on the EC2 Instance

```bash
git clone YOUR_REPO_URL
cd REPO_FOLDER
```

## 4) Run the Stack with Docker Compose

```bash
docker compose up -d --build
```

### Useful URLs

- Ingestion API: `http://YOUR_PUBLIC_IP/api/v1/vitals`
- Jenkins: `http://YOUR_PUBLIC_IP:8080`
- Grafana: `http://YOUR_PUBLIC_IP:3000`
- Prometheus: `http://YOUR_PUBLIC_IP:9090`

## 5) Configure Jenkins

1. Open Jenkins, finish the initial setup, and install suggested plugins.
2. Ensure Docker is accessible to Jenkins:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

3. Create a Pipeline job pointing at your repo and set it to use `Jenkinsfile`.

## 6) Test the Ingestion Flow

```bash
curl -X POST http://YOUR_PUBLIC_IP/api/v1/vitals \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"p1","timestamp":"2026-04-30T12:00:00Z","heart_rate":130,"spo2":88}'
```

You should see an alert in the dashboard stream:

```bash
curl http://YOUR_PUBLIC_IP:8003/stream
```

## 7) Local Development (Optional)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn ingestion_service.main:app --reload --port 8001
uvicorn analysis_service.main:app --reload --port 8002
uvicorn dashboard_service.main:app --reload --port 8003
```

## Notes

- The EC2 instance uses a 2GB swap file to reduce OOM risk.
- Memory limits are set per container in `docker-compose.yml`.
- Prometheus is configured to scrape `/metrics` from the services.
