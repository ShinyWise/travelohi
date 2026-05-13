FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o account-binary ./cmd/server/account/main.go 

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/account-binary .

EXPOSE 50052

CMD ["./account-binary"]