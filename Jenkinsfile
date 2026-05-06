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
        sh '''
          # 1. Create a virtual environment
          python3 -m venv venv
          
          # 2. Use the pip inside the venv to install requirements
          ./venv/bin/pip install --upgrade pip
          ./venv/bin/pip install -r requirements.txt
          
          # 3. Run pytest using the venv's python
          ./venv/bin/python -m pytest -q
        '''
      }
    }

    stage('Deploy') {
      steps {
        // This requires the 'jenkins' user to have permission 
        // to use /var/run/docker.sock
        sh 'docker compose up -d --build'
      }
    }
  }
}