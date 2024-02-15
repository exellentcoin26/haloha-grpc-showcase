#! /usr/bin/env bash

# Directory where the proto files are located
PROTO_DIR="../proto"

# Generate typescript code using
protoc \
    --plugin=./node_modules/.bin/protoc-gen-ts_proto \
    -I "$PROTO_DIR" \
    --ts_proto_out=./src/proto \
    --ts_proto_opt=env=browser,outputServices=nice-grpc,outputServices=generic-definitions \
    "$PROTO_DIR"/**/*.proto
