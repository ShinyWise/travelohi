#!/bin/sh
# Generate Go backend protos
protoc --proto_path=. \
       --go_out=travelohi-backend \
       --go_opt=module=github.com/travelohi/backend \
       --go-grpc_out=travelohi-backend \
       --go-grpc_opt=module=github.com/travelohi/backend \
       proto/travelohi/v1/*/*.proto

# Generate TypeScript frontend protos
cd proto
protoc --proto_path=. \
       --ts_out=../travelohi-frontend/src/proto \
       travelohi/v1/*/*.proto
cd ..

 