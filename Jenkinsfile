pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SONAR_HOST_URL = 'https://sonarcloud.io'
    SONAR_PROJECT_KEY = 'your-org_healthtech-demo'
    SONAR_ORGANIZATION = 'your-org'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      steps {
        sh 'python -m pip install --upgrade pip'
        sh 'pip install -r requirements.txt'
        sh 'pytest -q'
      }
    }

    stage('SonarCloud Scan') {
      steps {
        withEnv([
          "SONAR_TOKEN=${env.SONAR_TOKEN}",
          "SONAR_HOST_URL=${env.SONAR_HOST_URL}",
          "SONAR_PROJECT_KEY=${env.SONAR_PROJECT_KEY}",
          "SONAR_ORGANIZATION=${env.SONAR_ORGANIZATION}"
        ]) {
          sh 'sonar-scanner -Dsonar.projectKey=$SONAR_PROJECT_KEY -Dsonar.organization=$SONAR_ORGANIZATION -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.login=$SONAR_TOKEN'
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Deploy') {
      steps {
        sh 'docker compose up -d --build'
      }
    }
  }
}
