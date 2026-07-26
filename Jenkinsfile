pipeline {
    agent any

    environment {
        AWS_REGION   = 'ap-south-1'
        ECR_REGISTRY = '842746302447.dkr.ecr.ap-south-1.amazonaws.com'
    }

    triggers {
        pollSCM('H/5 * * * *')  // check for new commits every 5 minutes
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = powershell(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                }
            }
        }

        stage('Detect changes') {
            steps {
                script {
                    def changes = powershell(script: 'git diff --name-only HEAD~1 HEAD', returnStdout: true).trim()
                    env.BACKEND_CHANGED  = changes.contains('application-code/app-tier') ? 'true' : 'false'
                    env.FRONTEND_CHANGED = changes.contains('application-code/web-tier') ? 'true' : 'false'
                    echo "Backend changed: ${env.BACKEND_CHANGED}, Frontend changed: ${env.FRONTEND_CHANGED}"
                }
            }
        }

        stage('Backend: Build & Push') {
            when { environment name: 'BACKEND_CHANGED', value: 'true' }
            steps {
                dir('aws_3tier_architecture/application-code/app-tier') {
                    powershell """
                        docker build -t backend:$env:IMAGE_TAG .
                        docker tag backend:$env:IMAGE_TAG $env:ECR_REGISTRY/three-tier-poc-backend:$env:IMAGE_TAG
                        docker push $env:ECR_REGISTRY/three-tier-poc-backend:$env:IMAGE_TAG
                    """
                }
            }
        }

        stage('Backend: Deploy') {
            when { environment name: 'BACKEND_CHANGED', value: 'true' }
            steps {
                dir('Helm') {
                    powershell """
                        helm upgrade backend ./backend -n backend -f backend\\secrets.values.yaml --set image.tag=$env:IMAGE_TAG
                        kubectl rollout status deployment/backend -n backend --timeout=90s
                    """
                }
            }
        }

        stage('Frontend: Build & Push') {
            when { environment name: 'FRONTEND_CHANGED', value: 'true' }
            steps {
                dir('aws_3tier_architecture/application-code/web-tier') {
                    powershell """
                        docker build -t frontend:$env:IMAGE_TAG .
                        docker tag frontend:$env:IMAGE_TAG $env:ECR_REGISTRY/three-tier-poc-frontend:$env:IMAGE_TAG
                        docker push $env:ECR_REGISTRY/three-tier-poc-frontend:$env:IMAGE_TAG
                    """
                }
            }
        }

        stage('Frontend: Deploy') {
            when { environment name: 'FRONTEND_CHANGED', value: 'true' }
            steps {
                dir('Helm') {
                    powershell """
                        helm upgrade frontend ./frontend -n frontend --set image.tag=$env:IMAGE_TAG
                        kubectl rollout status deployment/frontend -n frontend --timeout=90s
                    """
                }
            }
        }
    }

    post {
        success { echo "Pipeline completed. Backend: ${env.BACKEND_CHANGED}, Frontend: ${env.FRONTEND_CHANGED}" }
        failure { echo "Pipeline failed — check the stage logs above." }
    }
}