pipeline {
    agent any

    options {
        disableConcurrentBuilds()
    }

    triggers {
        githubPush()
    }

    environment {
        FRONTEND_IMAGE = 'kushan477/lms-frontend:latest'
        BACKEND_IMAGE  = 'kushan477/lms-backend:latest'
        DOCKER_NETWORK = 'lms-network'
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Geesara-Abenayaka/Software-Group-Project.git'
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -eu

                    docker build -t "$BACKEND_IMAGE" ./server
                    docker build -t "$FRONTEND_IMAGE" .
                '''
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x

                        trap 'docker logout >/dev/null 2>&1 || true' EXIT

                        printf '%s' "$DOCKERHUB_PASSWORD" |
                            docker login \
                                --username "$DOCKERHUB_USER" \
                                --password-stdin

                        docker push "$BACKEND_IMAGE"
                        docker push "$FRONTEND_IMAGE"
                    '''
                }
            }
        }

        stage('Deploy on EC2') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_PASSWORD'
                    ),
                    string(
                        credentialsId: 'mongodb-uri',
                        variable: 'MONGODB_URI'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x

                        : "${MONGODB_URI:?MongoDB URI is required}"

                        trap 'docker logout >/dev/null 2>&1 || true' EXIT

                        printf '%s' "$DOCKERHUB_PASSWORD" |
                            docker login \
                                --username "$DOCKERHUB_USER" \
                                --password-stdin

                        docker network inspect "$DOCKER_NETWORK" \
                            >/dev/null 2>&1 ||
                            docker network create "$DOCKER_NETWORK"

                        docker pull "$BACKEND_IMAGE"
                        docker pull "$FRONTEND_IMAGE"

                        docker rm -f lms-frontend-container \
                            >/dev/null 2>&1 || true

                        docker rm -f lms-backend-container \
                            >/dev/null 2>&1 || true

                        docker run -d \
                            --restart unless-stopped \
                            --network "$DOCKER_NETWORK" \
                            --network-alias backend \
                            -p 5000:5000 \
                            -e MONGODB_URI \
                            --name lms-backend-container \
                            "$BACKEND_IMAGE"

                        docker run -d \
                            --restart unless-stopped \
                            --network "$DOCKER_NETWORK" \
                            -p 80:80 \
                            --name lms-frontend-container \
                            "$FRONTEND_IMAGE"

                        docker image prune -f
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'LMS deployment completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the Jenkins console output.'
        }
    }
}
