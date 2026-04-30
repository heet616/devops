# HealthTech Free-Tier EC2

## Quick Start

1. Ensure your AWS credentials are configured (e.g., `aws configure`).
2. Create a key pair in AWS and note its name.
3. From this directory:

```bash
terraform init
terraform apply -var="key_name=YOUR_KEYPAIR_NAME"
```

## Notes

- SSH is open to `allowed_ssh_cidr` (default `0.0.0.0/0`).
- Swap is created at `/swapfile` (2GB) to reduce OOM risk.
- Docker and Docker Compose plugin are installed in `user_data`.
