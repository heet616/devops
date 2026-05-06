pipeline {
  agent any
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
    stage('Deploy') {
      steps {
        sh 'docker compose up -d --build'
      }
    }
  }
}
