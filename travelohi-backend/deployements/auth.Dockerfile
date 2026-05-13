FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o auth-binary ./cmd/auth/main.go 

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/auth-binary .

EXPOSE 50051

CMD ["./auth-binary"]