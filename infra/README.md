# HealthTech Multi-EC2

## Quick Start

1. Ensure your AWS credentials are configured (e.g., `aws configure`).
2. Create a key pair in AWS and note its name.
3. From this directory:

```bash
terraform init
terraform apply -var="key_name=YOUR_KEYPAIR_NAME"
```

## Instance Layout

By default, Terraform creates three EC2 instances:

- `app`: frontend + ingestion/analysis/dashboard services
- `monitoring`: Grafana + Prometheus
- `jenkins`: Jenkins

To deploy only two instances, override the map and remove `jenkins`:

```bash
terraform apply \
	-var="key_name=YOUR_KEYPAIR_NAME" \
	-var='instances={app={instance_type="t3.micro"},monitoring={instance_type="t3.micro"}}'
```

## Connectivity Notes

- Prometheus scrapes the app node over private VPC networking.
- Grafana is exposed on port `3001` on the monitoring node.
- Frontend is exposed on port `3000` on the app node.

Update these URLs after apply:

- `VITE_API_BASE` -> `http://<app_public_ip>:8000`
- `VITE_GRAFANA_BASE` -> `http://<monitoring_public_ip>:3001`

## Notes

- SSH is open to `allowed_ssh_cidr` (default `0.0.0.0/0`).
- Swap is created at `/swapfile` (2GB) to reduce OOM risk.
- Docker and Docker Compose plugin are installed in `user_data`.
