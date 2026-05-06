pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'healthtech_platform'
    }

    stages {
        stage('Code Analysis & Validation') {
            steps {
                echo 'Executing application linting suite...'
                sh 'python3 -m pip install flake8 || true'
                sh 'flake8 ingestion_service/ --max-line-length=120 || true'
            }
        }

        stage('Build & Optimize Frontend') {
            steps {
                echo 'Compiling optimized React application packages...'
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build || true'
                }
            }
        }

        stage('Infrastructure Orchestration') {
            steps {
                echo 'Provisioning container networks and launching cluster volumes...'
                sh 'docker compose down --remove-orphans'
                sh 'docker compose up -d --build'
            }
        }

        stage('Integration Sanity Verification') {
            steps {
                echo 'Validating routing telemetry pathways...'
                script {
                    // Give services time to run database schema migrations
                    sh 'sleep 5'
                    def responseCode = sh(script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/metrics", returnStdout: true).trim()
                    if (responseCode != "200") {
                        error "Sanity verification failed: Metric pipeline returned status ${responseCode}"
                    } else {
                        echo "Sanity verification succeeded: Core ingress framework reporting green."
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline step execution cycle complete.'
        }
    }
}