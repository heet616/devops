pipeline {
    agent any
    
    stages {
        stage('Build & Deploy') {
            steps {
                echo 'Launching MedIoT Stack...'
                // Removed the --remove-orphans flag
                sh 'docker compose down'
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