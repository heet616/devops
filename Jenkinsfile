pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = 'healthtech_platform'
    }

    stages {
        stage('Code Analysis & Validation') {
            steps {
                echo 'Executing application linting suite via Python container...'
                // We run a temporary python container to do the linting
                sh 'docker run --rm -v ${WORKSPACE}:/app -w /app python:3.11-slim sh -c "pip install flake8 && flake8 ingestion_service/ --max-line-length=120"'
            }
        }

        stage('Build & Optimize Frontend') {
            steps {
                echo 'Compiling React assets via Node container...'
                // We run a temporary node container to build the frontend
                // This creates the 'dist' folder on your host so Docker Compose can find it later
                sh 'docker run --rm -v ${WORKSPACE}/frontend:/app -w /app node:20-slim sh -c "npm install && npm run build"'
            }
        }

        stage('Infrastructure Orchestration') {
            steps {
                echo 'Provisioning container networks and launching cluster volumes...'
                // This works because you mapped /var/run/docker.sock
                sh 'docker compose down --remove-orphans'
                sh 'docker compose up -d --build'
            }
        }

        stage('Integration Sanity Verification') {
            steps {
                echo 'Validating routing telemetry pathways...'
                script {
                    sh 'sleep 10' // Give DB migrations time to finish
                    
                    // Since Jenkins is in the 'health_network', it should call the service name
                    // We use a curl container to perform the check
                    def responseCode = sh(
                        script: "docker run --rm --network health_network curlimages/curl -s -o /dev/null -w '%{http_code}' http://ingestion-service:8000/metrics", 
                        returnStdout: true
                    ).trim()
                    
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