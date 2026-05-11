# Makefile

# Start docker services
up:
	docker-compose up -d

# Stop docker services
down:
	docker-compose down

# Generate Go gRPC code
.PHONY: generate-protos
generate-protos:
	@echo "Building protoc docker image..."
	docker build -f Dockerfile.protoc -t travelohi-protoc-builder .
	@echo "Generating Go gRPC code..."
	docker run --rm -v .:/workspace travelohi-protoc-builder sh gen-protos.sh
	@echo "Proto generation complete!"