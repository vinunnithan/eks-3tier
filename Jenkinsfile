pipeline {
    agent any

    environment {
        AWS_REGION   = 'ap-south-1'
        ECR_REGISTRY = '842746302447.dkr.ecr.ap-south-1.amazonaws.com'
        CLUSTER      = 'three-tier-poc-cluster'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }

        stage('Detect changes') {
            steps {
                script {
                    def isFirstBuild = sh(script: 'git rev-parse HEAD~1', returnStatus: true) != 0

                    if (isFirstBuild) {
                        echo "No previous commit found — building everything."
                        env.BACKEND_CHANGED  = 'true'
                        env.FRONTEND_CHANGED = 'true'
                        env.MYSQL_CHANGED    = 'true'
                    } else {
                        def changes = sh(script: 'git diff --name-only HEAD~1 HEAD', returnStdout: true).trim()
                        env.BACKEND_CHANGED  = changes.contains('application-code/app-tier') ? 'true' : 'false'
                        env.FRONTEND_CHANGED = changes.contains('application-code/web-tier') ? 'true' : 'false'
                        env.MYSQL_CHANGED    = changes.contains('Helm/mysql') ? 'true' : 'false'
                    }

                    echo "Backend: ${env.BACKEND_CHANGED}, Frontend: ${env.FRONTEND_CHANGED}, MySQL: ${env.MYSQL_CHANGED}"
                }
            }
        }

        stage('Configure kubeconfig') {
            when {
                anyOf {
                    environment name: 'BACKEND_CHANGED', value: 'true'
                    environment name: 'FRONTEND_CHANGED', value: 'true'
                    environment name: 'MYSQL_CHANGED', value: 'true'
                }
            }
            steps {
                sh '''
                    aws eks update-kubeconfig \
                        --region $AWS_REGION \
                        --name $CLUSTER

                    kubectl get nodes
                '''
            }
        }

        // ===========================
        // MySQL
        // ===========================

        stage('MySQL: Deploy') {
            when { environment name: 'MYSQL_CHANGED', value: 'true' }
            steps {
                dir('Helm') {
                    sh """
                        helm upgrade --install mysql ./mysql \
                            -n database \
                            -f /var/lib/jenkins/secrets/mysql-secrets.values.yaml

                        kubectl rollout status statefulset/mysql \
                            -n database \
                            --timeout=120s
                    """
                }
            }
        }

        stage('ECR Login') {
            when {
                anyOf {
                    environment name: 'BACKEND_CHANGED', value: 'true'
                    environment name: 'FRONTEND_CHANGED', value: 'true'
                }
            }
            steps {
                sh '''
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login --username AWS --password-stdin $ECR_REGISTRY
                '''
            }
        }

        // ===========================
        // Backend
        // ===========================

        stage('Backend: Build Image') {
            when { environment name: 'BACKEND_CHANGED', value: 'true' }
            steps {
                dir('aws_3tier_architecture/application-code/app-tier') {
                    sh '''
                        docker build -t backend:$IMAGE_TAG .
                    '''
                }
            }
        }

        stage('Backend: Trivy Scan') {
            when { environment name: 'BACKEND_CHANGED', value: 'true' }
            steps {
                sh '''
                    export TRIVY_CACHE_DIR=/var/lib/jenkins/trivy-cache
                    mkdir -p $TRIVY_CACHE_DIR

                    trivy image \
                      --cache-dir $TRIVY_CACHE_DIR \
                      --severity HIGH,CRITICAL \
                      --exit-code 0 \
                      backend:$IMAGE_TAG
                '''
            }
        }

        stage('Backend: Push & Deploy') {
            when { environment name: 'BACKEND_CHANGED', value: 'true' }
            steps {

                sh """
                    docker tag backend:$IMAGE_TAG \
                    $ECR_REGISTRY/three-tier-poc-backend:$IMAGE_TAG

                    docker push \
                    $ECR_REGISTRY/three-tier-poc-backend:$IMAGE_TAG
                """

                dir('Helm') {
                    sh """
                        helm upgrade --install backend ./backend \
                            -n backend \
                            -f /var/lib/jenkins/secrets/backend-secrets.values.yaml \
                            --set image.tag=$IMAGE_TAG

                        kubectl rollout status deployment/backend \
                            -n backend \
                            --timeout=90s
                    """
                }
            }
        }

        // ===========================
        // Frontend
        // ===========================

        stage('Frontend: Build Image') {
            when { environment name: 'FRONTEND_CHANGED', value: 'true' }
            steps {
                dir('aws_3tier_architecture/application-code/web-tier') {
                    sh '''
                        docker build -t frontend:$IMAGE_TAG .
                    '''
                }
            }
        }

        stage('Frontend: Trivy Scan') {
            when { environment name: 'FRONTEND_CHANGED', value: 'true' }
            steps {
                sh '''
                    export TRIVY_CACHE_DIR=/var/lib/jenkins/trivy-cache
                    mkdir -p $TRIVY_CACHE_DIR

                    trivy image \
                      --cache-dir $TRIVY_CACHE_DIR \
                      --severity HIGH,CRITICAL \
                      --exit-code 0 \
                      frontend:$IMAGE_TAG
                '''
            }
        }

        stage('Frontend: Push & Deploy') {
            when { environment name: 'FRONTEND_CHANGED', value: 'true' }
            steps {

                sh """
                    docker tag frontend:$IMAGE_TAG \
                    $ECR_REGISTRY/three-tier-poc-frontend:$IMAGE_TAG

                    docker push \
                    $ECR_REGISTRY/three-tier-poc-frontend:$IMAGE_TAG
                """

                dir('Helm') {
                    sh """
                        helm upgrade --install frontend ./frontend \
                            -n frontend \
                            --set image.tag=$IMAGE_TAG

                        kubectl rollout status deployment/frontend \
                            -n frontend \
                            --timeout=90s
                    """
                }
            }
        }

        stage('Verify Deployment') {
            when {
                anyOf {
                    environment name: 'BACKEND_CHANGED', value: 'true'
                    environment name: 'FRONTEND_CHANGED', value: 'true'
                    environment name: 'MYSQL_CHANGED', value: 'true'
                }
            }
            steps {
                sh '''
                    echo "========== MySQL Pod =========="
                    kubectl get pods -n database

                    echo ""
                    echo "========== Backend Pods =========="
                    kubectl get pods -n backend

                    echo ""
                    echo "========== Frontend Pods =========="
                    kubectl get pods -n frontend

                    echo ""
                    echo "========== Ingress =========="
                    kubectl get ingress -n frontend
                '''
            }
        }
    }

    post {

        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the logs above.'
        }

        always {
            cleanWs()
        }
    }
}