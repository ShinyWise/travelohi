.PHONY: up down build logs seed clean

# start infrastructure
up:
	docker compose up --build

# stop
down:
	docker compose down

# rebuild
build:
	docker compose build

# cek logs
logs:
	docker compose logs -f

# seeder, service udh jalan
seed:
	go run cmd/seeder/main.go

# hapus semua, including volume database
clean:
	docker compose down -v
