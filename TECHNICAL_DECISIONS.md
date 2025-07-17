# Technical Decisions

This document summarizes the main technology choices and strategies used in this project, and the rationale behind them.

## Main Technologies

- **Node.js**: Chosen for its performance, event-driven architecture, and strong ecosystem for backend services and file processing.
- **TypeScript**: Provides static typing, better code quality, and maintainability for a large codebase.
- **Fastify**: Selected for its high performance, low overhead, and built-in support for JSON schema validation and OpenAPI/Swagger documentation.
- **TypeORM**: Used as the ORM for interacting with SQL Server, enabling type-safe database access and easy migrations.
- **SQL Server**: The target database as per requirements, suitable for large-scale, transactional data storage.
- **Docker**: Ensures consistent, reproducible environments for development, testing, and production. Multi-stage builds keep the final image small and secure.

## Key Strategies

- **Large File Processing**: The system is designed to efficiently process very large files (4GB+), using streaming and batching to avoid memory overload.
- **Concurrency**: For very large files, the system can process data in parallel using worker threads, improving throughput and scalability.
- **Dependency Injection (Inversify)**: Promotes modular, testable code by decoupling service implementations from their consumers.
- **Validation & Error Handling**: Fastify's schema-based validation ensures robust API contracts. Centralized error handling and logging provide observability and easier debugging.
- **Health Endpoint**: `/health` endpoint is always responsive, even during heavy processing, to support orchestration and monitoring.
- **Testing**: Jest is used for unit and integration tests, with service mocking to enable fast, isolated test runs.
- **OpenAPI/Swagger**: API documentation is auto-generated and available via Swagger UI, improving developer experience and integration.

## Scalability Considerations

- The architecture supports horizontal scaling (multiple containers) and can be adapted for distributed processing if needed.
- Concurrency and batching parameters can be tuned for different hardware or file sizes.

---

## Production Considerations

If this project were to be deployed in a real-world production environment, the following improvements and practices would be considered:

- **Advanced Monitoring & Tracing**: Integrate distributed tracing (e.g., OpenTelemetry) and advanced monitoring (e.g., Prometheus, Grafana) to track performance, detect bottlenecks, and quickly diagnose issues in production.
- **Message Queue for File Processing**: Use a message queue (e.g., RabbitMQ, Kafka) to decouple file upload from processing, enabling better load balancing, retry mechanisms, and horizontal scaling of workers.
- **Robust Error Handling & Retries**: Implement retry and backoff strategies for transient errors (e.g., database or network issues), and ensure failed records are logged and can be reprocessed safely.
- **Security Hardening**: Store secrets and configuration securely (e.g., environment variables, secret managers), enable HTTPS, validate all inputs strictly, and follow least-privilege principles for database and network access.
- **Cloud-Native Storage & Processing**: For very large files, use cloud storage solutions (e.g., AWS S3, Azure Blob Storage) and consider serverless or distributed processing frameworks to handle spikes in load and very large datasets efficiently.
- **Increase the Concurrency Threshold**: The threshold is set to 5000 lines for testing purposes. I would make it larger (or control it through environment variables) so it starts using the concurrency method only when it is really necessary.

---

For more details, see the code comments and the main [README.md](./README.md). 