.PHONY: help install build start dev test clean docker-build docker-up docker-down docker-logs

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  build       - Build the application"
	@echo "  start       - Start the application in production mode"
	@echo "  dev         - Start the application in development mode"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-up   - Start services with Docker Compose"
	@echo "  docker-down - Stop services with Docker Compose"
	@echo "  docker-logs - Show Docker logs"

# Install dependencies
install:
	npm install

# Build the application
build:
	npm run build

# Start in production mode
start:
	npm start

# Start in development mode
dev:
	npm run dev

# Run tests
test:
	npm test

# Clean build artifacts
clean:
	rm -rf dist node_modules package-lock.json

# Docker commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
	@echo ""
	@echo "🚀 Services are starting up..."
	@echo "⏳ Waiting for services to be ready..."
	@sleep 5
	@echo ""
	@echo "✅ Services should now be running!"
	@echo "🌐 Server started at: http://localhost:3001"
	@echo "📚 Reach http://localhost:3001/documentation for more info about the endpoints"
	@echo "💚 Health check: http://localhost:3001/health"
	@echo ""
	@echo "📋 Useful commands:"
	@echo "  make docker-logs    - View logs"
	@echo "  make docker-down    - Stop services"
	@echo "  make health         - Check service health"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Database commands
db-setup:
	@echo "Setting up SQL Server database..."
	@echo "Make sure SQL Server is running and accessible"
	@echo "You can use the database-setup.sql script to create tables"

# Performance testing
perf-test:
	npm run perf:test

load-test:
	npm run load:test

# Health check
health:
	curl -f http://localhost:3001/health || echo "Service is not healthy" 