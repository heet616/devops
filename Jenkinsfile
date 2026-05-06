pipeline {
    agent any
    stages {
        stage('Build & Deploy') {
            steps {
                echo 'Launching MedIoT Stack...'
                // We run compose directly. Compose will look for 'ingestion_service/' 
                // relative to the docker-compose.yml file it just found in the repo.
                sh 'docker compose down --remove-orphans'
                sh 'docker compose up -d --build'
            }
        }
        
        stage('Integration Check') {
            steps {
                script {
                    sh 'sleep 10'
                    // Check if the ingestion service is actually responding
                    sh 'curl http://localhost:8000/metrics || exit 1'
                }
            }
        }
    }
}