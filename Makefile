# Makefile

COMPOSE_CMD = docker-compose -f travelohi-backend/docker-compose.yml

# Start docker services normally
up:
	$(COMPOSE_CMD) up -d

# Start docker services AND force a rebuild of the Go containers
# jalanin kalo go file di modif
up-build:
	$(COMPOSE_CMD) up --build -d

# stop docker
down:
	$(COMPOSE_CMD) down

# stop docker services and wipe the database volume
down-clean:
	$(COMPOSE_CMD) down -v

# view docker logs
logs:
	$(COMPOSE_CMD) logs -f

# view docker logs auth service
logs-auth:
	$(COMPOSE_CMD) logs -f auth-service

# view docker logs account service
logs-account:
	$(COMPOSE_CMD) logs -f account-service

# tidy go
tidy:
	cd travelohi-backend && go mod tidy

# Generate Go gRPC code
.PHONY: generate-protos
generate-protos:
	@echo "Building protoc docker image..."
	docker build -f Dockerfile.protoc -t travelohi-protoc-builder .
	@echo "Generating Go gRPC code..."
	docker run --rm -v .:/workspace travelohi-protoc-builder sh gen-protos.sh
	@echo "Proto generation complete!"