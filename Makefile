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
	docker run --rm -v .:/workspace travelohi-protoc-builder \
		protoc \
		--proto_path=proto \
		--go_out=travelohi-backend \
		--go_opt=module=github.com/travelohi/backend \
		--go-grpc_out=travelohi-backend \
		--go-grpc_opt=module=github.com/travelohi/backend \
		proto/travelohi/v1/user/user.proto
	@echo "Proto generation complete!"