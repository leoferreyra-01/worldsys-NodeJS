# Node.js Backend Challenge

## Context

You are working on a backend microservice developed in Node.js. This service runs inside a Docker container on a Kubernetes environment with Linux operating system.

The system receives daily a large file (approximately 4 GB) with customer records. Each line of the file represents a separate record. Your objective is to process this file and dump the data into a SQL Server database.

## Quick Start

### Using Docker Compose with Makefile (Recommended)

1. **Start the services:**
   ```bash
   make docker-up
   # or
   docker-compose build
   docker-compose up
   ```
   The API will automatically wait for SQL Server to be ready before starting and will set up the database table automatically.

2. **Manual database setup (if needed, you can probably skip this one):**
   ```bash
   make db-setup
   # or for manual instructions
   make db-setup-manual
   ```

3. **Check service health:**
   ```bash
   make health
   ```

4. **View logs:**
   ```bash
   make docker-logs
   ```

5. **Stop services:**
   ```bash
   make docker-down
   ```

6. **Run test (doesn't need the docker up and running):**
   ```bash
   make install
   make test
   ```

#### Troubleshooting
- If SQL Server is slow to start, the API will keep retrying until it can connect.
- If you see connection errors at first, just wait a minute and check logs with `make docker-logs`.

## Objective

Develop a solution that:

1. **Process correctly** the content of the file CLIENTES_IN_0425_FUSIONADO_PROD.dat
2. **Insert the processed data** into a SQL Server table
3. **Expose an HTTP endpoint** `/health` that reflects that the service is operational even during processing
4. **Deliver a technical proposal** that scales for files 5 times larger
5. **Document the technical decisions** taken

## Expected Delivery

You must deliver:

### Required Components
- **Complete service source code**
- **SQL script** to create the destination table
- **Clear instructions** on how to execute the service (can be with docker-compose, Makefile, etc.)
- **A document (max. 1 page)** explaining:
  - What strategies you used and why
  - What measures you took to ensure performance and robustness
  - What decisions you made in the face of possible bottlenecks
  - What you would do differently if this were in production

## Environment Conditions

The service will run in a Kubernetes pod with the following resources:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

## Rules

- **No modification** of the file is allowed, nor preprocessing outside the service
- **You must be able to defend** everything implemented during the technical interview

## Extras (not mandatory, but add value)

- **Error tolerance** in corrupted lines of the file
- **Progress monitoring** or performance
- **Memory or CPU usage** metrics
- **Strategy to parallelize** processing or scale horizontally
- **Use of informative** logs

---

## Technical Decisions

See [TECHNICAL_DECISIONS.md](./TECHNICAL_DECISIONS.md) for a summary of the main technologies and strategies used in this project, and the rationale behind them.
