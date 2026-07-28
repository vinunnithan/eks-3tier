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

        stage('Configure kubeconfig') {
            steps {
                sh '''
                    aws eks update-kubeconfig \
                        --region $AWS_REGION \
                        --name $CLUSTER

                    kubectl get nodes
                '''
            }
        }

        stage('ECR Login') {
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
            steps {
                dir('aws_3tier_architecture/application-code/app-tier') {
                    sh '''
                        docker build -t backend:$IMAGE_TAG .
                    '''
                }
            }
        }

        /*
        stage('Backend: Trivy Scan') {
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
        */

        stage('Backend: Push & Deploy') {
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
            steps {
                dir('aws_3tier_architecture/application-code/web-tier') {
                    sh '''
                        docker build -t frontend:$IMAGE_TAG .
                    '''
                }
            }
        }

        /*
        stage('Frontend: Trivy Scan') {
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
        */

        stage('Frontend: Push & Deploy') {
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
            steps {
                sh '''
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