FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o hotel-binary ./cmd/server/hotel/main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/hotel-binary .

EXPOSE 50053

CMD ["./hotel-binary"]