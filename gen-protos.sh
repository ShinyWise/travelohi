#!/bin/sh
protoc --proto_path=. \
       --go_out=travelohi-backend \
       --go_opt=module=github.com/travelohi/backend \
       --go-grpc_out=travelohi-backend \
       --go-grpc_opt=module=github.com/travelohi/backend \
       proto/travelohi/v1/*/*.proto
