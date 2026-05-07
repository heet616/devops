pipeline {
    agent any

        parameters {
                string(name: 'REPO_URL', defaultValue: 'https://github.com/heet616/devops', description: 'Git repo URL to deploy')
                string(name: 'SSH_KEY_PATH', defaultValue: '/var/jenkins_home/.ssh/devops_key.pem', description: 'Path to EC2 SSH private key on Jenkins host')
                string(name: 'KEY_NAME', defaultValue: 'devops_key', description: 'EC2 key pair name (Terraform var)')
                string(name: 'ALLOWED_SSH_CIDR', defaultValue: '0.0.0.0/0', description: 'CIDR allowed to SSH (Terraform var)')
                string(name: 'AWS_REGION', defaultValue: 'eu-north-1', description: 'AWS region for Terraform')
        }

            environment {
                TF_BIN = "${WORKSPACE}/.tools/terraform/terraform"
                AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
                AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
                AWS_DEFAULT_REGION = "${params.AWS_REGION}"
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
                                    sh '"${TF_BIN}" apply -auto-approve -var="key_name=${KEY_NAME}" -var="allowed_ssh_cidr=${ALLOWED_SSH_CIDR}" -var="aws_region=${AWS_REGION}"'
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
                                                if [ ! -d /opt/healthtech ]; then
                                                    sudo mkdir -p /opt/healthtech
                                                    sudo chown ubuntu:ubuntu /opt/healthtech
                                                fi
                                                cd /opt/healthtech
                                                if [ ! -d devops ]; then
                                                    git clone ${REPO_URL} devops
                                                fi
                                                cd devops
                                                cat > .env <<ENV
VITE_API_BASE=http://${appPublicIp}:8000
VITE_GRAFANA_BASE=http://${monitoringPublicIp}:3001
ENV
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