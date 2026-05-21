FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -o telemetry-binary ./cmd/server/telemetry/main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/telemetry-binary .

EXPOSE 50057

CMD ["./telemetry-binary"]
