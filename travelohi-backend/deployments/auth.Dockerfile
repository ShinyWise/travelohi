FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -o auth-binary ./cmd/server/auth/main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/auth-binary .

EXPOSE 50051

CMD ["./auth-binary"]