# Makefile

# Start docker services normally
up:
	docker-compose up -d

# Start docker services AND force a rebuild of the Go containers
# jalanin kalo go file di modif
up-build:
	docker-compose up --build -d

# stop docker
down:
	docker-compose down

# stop docker services and wipe the database volume
down-clean:
	docker-compose down -v

# view docker logs
logs:
	docker-compose logs -f

# view docker logs auth service
logs-auth:
	docker-compose logs -f auth-service

# view docker logs account service
logs-account:
	docker-compose logs -f account-service

# tidy go
tidy:
	go mod tidy

# Generate Go gRPC code
.PHONY: generate-protos
generate-protos:
	@echo "Building protoc docker image..."
	docker build -f Dockerfile.protoc -t travelohi-protoc-builder .
	@echo "Generating Go gRPC code..."
	docker run --rm -v .:/workspace travelohi-protoc-builder sh gen-protos.sh
	@echo "Proto generation complete!"