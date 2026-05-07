pipeline {
    agent any

        parameters {
                string(name: 'REPO_URL', defaultValue: 'https://github.com/heet616/devops', description: 'Git repo URL to deploy')
                string(name: 'SSH_KEY_PATH', defaultValue: '/var/jenkins_home/.ssh/devops_key.pem', description: 'Path to EC2 SSH private key on Jenkins host')
                string(name: 'KEY_NAME', defaultValue: 'devops_key', description: 'EC2 key pair name (Terraform var)')
                string(name: 'ALLOWED_SSH_CIDR', defaultValue: '0.0.0.0/0', description: 'CIDR allowed to SSH (Terraform var)')
                string(name: 'AWS_REGION', defaultValue: 'eu-north-1', description: 'AWS region for Terraform')
                string(name: 'APP_SG_ID', defaultValue: 'sg-0deab94e46ffaa747', description: 'Existing app security group ID')
                string(name: 'MONITORING_SG_ID', defaultValue: 'sg-03aba78cf3cb97dd0', description: 'Existing monitoring security group ID')
                string(name: 'JENKINS_SG_ID', defaultValue: 'sg-0e7f7ed73d7da51ed', description: 'Existing Jenkins security group ID')
        }

            environment {
                TF_BIN = "${WORKSPACE}/.tools/terraform/terraform"
                AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
                AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
                AWS_DEFAULT_REGION = "${params.AWS_REGION}"
                APP_SG_ID = "${params.APP_SG_ID}"
                MONITORING_SG_ID = "${params.MONITORING_SG_ID}"
                JENKINS_SG_ID = "${params.JENKINS_SG_ID}"
            }

    stages {
                stage('Install Terraform') {
                    steps {
                        sh 'mkdir -p .tools/terraform'
                        sh 'curl -sSLo .tools/terraform/terraform.zip https://releases.hashicorp.com/terraform/1.9.5/terraform_1.9.5_linux_amd64.zip'
                        sh 'cd .tools/terraform && jar xf terraform.zip'
                        sh 'chmod +x .tools/terraform/terraform'
                    }
                }

                stage('Provision Infrastructure') {
            steps {
                withCredentials([
                    string(credentialsId: 'AWS_ACCESS_KEY_ID', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'AWS_SECRET_ACCESS_KEY', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                                dir('infra') {
                            sh '"${TF_BIN}" init'
                                    sh '"${TF_BIN}" apply -auto-approve -var="key_name=${KEY_NAME}" -var="allowed_ssh_cidr=${ALLOWED_SSH_CIDR}" -var="aws_region=${AWS_REGION}" -var="app_sg_id=${APP_SG_ID}" -var="monitoring_sg_id=${MONITORING_SG_ID}" -var="jenkins_sg_id=${JENKINS_SG_ID}"'
                                }
                }
            }
        }

                stage('Deploy App Stack') {
    steps {
        script {
            def appPublicIp = sh(script: 'cd infra && "${TF_BIN}" output -raw app_public_ip', returnStdout: true).trim()
            def monitoringPublicIp = sh(script: 'cd infra && "${TF_BIN}" output -raw monitoring_public_ip', returnStdout: true).trim()

                        sh """
                                ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_PATH} ubuntu@${appPublicIp} <<'EOF'
set -e

# 1. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo systemctl stop apt-daily.service apt-daily-upgrade.service || true
    sudo systemctl stop apt-daily.timer apt-daily-upgrade.timer || true
    sudo systemctl kill --kill-who=all apt-daily.service apt-daily-upgrade.service || true
    for i in \$(seq 1 40); do
        if sudo fuser /var/lib/dpkg/lock >/dev/null 2>&1 || \
             sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || \
             sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || \
             sudo fuser /var/cache/apt/archives/lock >/dev/null 2>&1; then
            echo "Waiting for apt locks..."
            sleep 3
        else
            break
        fi
    done
    sudo apt-get -o DPkg::Lock::Timeout=120 update -y
    sudo apt-get -o DPkg::Lock::Timeout=120 install -y docker.io docker-compose-plugin
    sudo usermod -aG docker ubuntu
    # Fix socket permissions for the current user
    sudo chmod 666 /var/run/docker.sock
fi

# 2. Setup Directory
if [ ! -d /opt/healthtech ]; then
    sudo mkdir -p /opt/healthtech
    sudo chown ubuntu:ubuntu /opt/healthtech
fi

cd /opt/healthtech

# 3. Clone or Update Repo
if [ ! -d devops ]; then
    git clone ${REPO_URL} devops
else
    cd devops && git pull && cd ..
fi

cd devops

# 4. Create .env file
cat > .env <<ENV
VITE_API_BASE=http://${appPublicIp}:8000
VITE_GRAFANA_BASE=http://${monitoringPublicIp}:3001
ENV

# 5. Deploy
docker compose -f docker-compose.app.yml up -d --build
EOF
                        """
        }
    }
}

                stage('Deploy Monitoring Stack') {
                        steps {
                                script {
                            def appPrivateIp = sh(script: 'cd infra && "${TF_BIN}" output -raw app_private_ip', returnStdout: true).trim()
                            def monitoringPublicIp = sh(script: 'cd infra && "${TF_BIN}" output -raw monitoring_public_ip', returnStdout: true).trim()

                                                                                sh """
                                                                                        ssh -o StrictHostKeyChecking=no -i ${SSH_KEY_PATH} ubuntu@${monitoringPublicIp} <<'EOF'
set -e
if [ ! -d /opt/healthtech ]; then
    sudo mkdir -p /opt/healthtech
    sudo chown ubuntu:ubuntu /opt/healthtech
fi
cd /opt/healthtech
if [ ! -d devops ]; then
    git clone ${REPO_URL} devops
fi
cd devops
cat > prometheus.yml <<PROM
global:
    scrape_interval: 5s
    evaluation_interval: 5s

scrape_configs:
    - job_name: 'ingestion-service'
        static_configs:
            - targets: ['${appPrivateIp}:8000']

    - job_name: 'analysis-service'
        static_configs:
            - targets: ['${appPrivateIp}:8002']
PROM
docker compose -f docker-compose.monitoring.yml up -d --build
EOF
                                                                                """
                                }
                        }
                }
    }
}