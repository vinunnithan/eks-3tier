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

        stage('Detect Changes') {
            steps {
                script {

                    def firstBuild = sh(
                        script: 'git rev-parse HEAD~1 >/dev/null 2>&1',
                        returnStatus: true
                    ) != 0

                    if (firstBuild) {

                        env.BACKEND_CHANGED  = "true"
                        env.FRONTEND_CHANGED = "true"
                        env.MYSQL_CHANGED    = "true"

                    } else {

                        def changes = sh(
                            script: 'git diff --name-only HEAD~1 HEAD',
                            returnStdout: true
                        ).trim()

                        env.BACKEND_CHANGED =
                            changes.contains("aws_3tier_architecture/application-code/app-tier") ||
                            changes.contains("Helm/backend")

                        env.FRONTEND_CHANGED =
                            changes.contains("aws_3tier_architecture/application-code/web-tier") ||
                            changes.contains("Helm/frontend")

                        env.MYSQL_CHANGED =
                            changes.contains("Helm/mysql")
                    }

                    echo "Backend Changed : ${env.BACKEND_CHANGED}"
                    echo "Frontend Changed: ${env.FRONTEND_CHANGED}"
                    echo "MySQL Changed   : ${env.MYSQL_CHANGED}"
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
            when {
                anyOf {
                    environment name: 'BACKEND_CHANGED', value: 'true'
                    environment name: 'FRONTEND_CHANGED', value: 'true'
                }
            }
            steps {
                sh '''
                    aws ecr get-login-password \
                    --region $AWS_REGION | \
                    docker login \
                    --username AWS \
                    --password-stdin $ECR_REGISTRY
                '''
            }
        }

        //==================================================
        // MYSQL
        //==================================================

        stage('Deploy MySQL') {
            steps {

                dir('Helm') {

                    sh """
                        helm upgrade --install mysql ./mysql \
                        -n database \
                        -f /var/lib/jenkins/secrets/mysql-secrets.values.yaml
                    """

                    sh '''
                        kubectl rollout status statefulset/mysql \
                        -n database \
                        --timeout=180s
                    '''
                }
            }
        }

        //==================================================
        // BACKEND BUILD
        //==================================================

        stage('Build Backend Image') {

            when {
                environment name: 'BACKEND_CHANGED', value: 'true'
            }

            steps {

                dir('aws_3tier_architecture/application-code/app-tier') {

                    sh '''
                        docker build \
                        -t backend:$IMAGE_TAG .
                    '''
                }
            }
        }

        stage('Scan Backend') {

            when {
                environment name: 'BACKEND_CHANGED', value: 'true'
            }

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

        stage('Push Backend Image') {

            when {
                environment name: 'BACKEND_CHANGED', value: 'true'
            }

            steps {

                sh """
                    docker tag backend:$IMAGE_TAG \
                    $ECR_REGISTRY/three-tier-poc-backend:$IMAGE_TAG

                    docker push \
                    $ECR_REGISTRY/three-tier-poc-backend:$IMAGE_TAG
                """
            }
        }

        //==================================================
        // DEPLOY BACKEND (ALWAYS)
        //==================================================

        stage('Deploy Backend') {

            steps {

                dir('Helm') {

                    script {

                        def imageTag = env.BACKEND_CHANGED == "true" ?
                                env.IMAGE_TAG :
                                sh(
                                    script: """
                                    kubectl get deployment backend \
                                    -n backend \
                                    -o=jsonpath='{.spec.template.spec.containers[0].image}' \
                                    | awk -F: '{print \$NF}'
                                    """,
                                    returnStdout: true
                                ).trim()

                        sh """
                            helm upgrade --install backend ./backend \
                            -n backend \
                            -f /var/lib/jenkins/secrets/backend-secrets.values.yaml \
                            --set image.tag=${imageTag}
                        """
                    }

                    sh '''
                        kubectl rollout status deployment/backend \
                        -n backend \
                        --timeout=180s
                    '''
                }
            }
        }

        //==================================================
        // FRONTEND BUILD
        //==================================================

        stage('Build Frontend Image') {

            when {
                environment name: 'FRONTEND_CHANGED', value: 'true'
            }

            steps {

                dir('aws_3tier_architecture/application-code/web-tier') {

                    sh '''
                        docker build \
                        -t frontend:$IMAGE_TAG .
                    '''
                }
            }
        }

        stage('Scan Frontend') {

            when {
                environment name: 'FRONTEND_CHANGED', value: 'true'
            }

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

        stage('Push Frontend Image') {

            when {
                environment name: 'FRONTEND_CHANGED', value: 'true'
            }

            steps {

                sh """
                    docker tag frontend:$IMAGE_TAG \
                    $ECR_REGISTRY/three-tier-poc-frontend:$IMAGE_TAG

                    docker push \
                    $ECR_REGISTRY/three-tier-poc-frontend:$IMAGE_TAG
                """
            }
        }

        //==================================================
        // DEPLOY FRONTEND (ALWAYS)
        //==================================================

        stage('Deploy Frontend') {

            steps {

                dir('Helm') {

                    script {

                        def imageTag = env.FRONTEND_CHANGED == "true" ?
                                env.IMAGE_TAG :
                                sh(
                                    script: """
                                    kubectl get deployment frontend \
                                    -n frontend \
                                    -o=jsonpath='{.spec.template.spec.containers[0].image}' \
                                    | awk -F: '{print \$NF}'
                                    """,
                                    returnStdout: true
                                ).trim()

                        sh """
                            helm upgrade --install frontend ./frontend \
                            -n frontend \
                            --set image.tag=${imageTag}
                        """
                    }

                    sh '''
                        kubectl rollout status deployment/frontend \
                        -n frontend \
                        --timeout=180s
                    '''
                }
            }
        }

        //==================================================
        // VERIFY
        //==================================================

        stage('Verify') {

            steps {

                sh '''
                    echo "=========================="

                    kubectl get pods -A

                    echo ""

                    kubectl get svc -A

                    echo ""

                    kubectl get ingress -A
                '''
            }
        }
    }

    post {

        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed.'
        }

        always {
            cleanWs()
        }
    }
}