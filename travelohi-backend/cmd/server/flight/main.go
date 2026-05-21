// cmd/flight/main.go
package main

import (
	"log"
	"net"
	"os"

	"github.com/bradfitz/gomemcache/memcache"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	authrepo "github.com/travelohi/backend/internal/auth/repository"
	flightgrpc "github.com/travelohi/backend/internal/flight/handler"
	"github.com/travelohi/backend/internal/flight/repository"
	"github.com/travelohi/backend/internal/flight/usecase"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/token"
	flightpb "github.com/travelohi/backend/proto/flight/v1"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	memcachedURL := os.Getenv("MEMCACHED_URL")
	jwtSecret := os.Getenv("JWT_SECRET")

	// 1. infrastructure connections
	dbConn, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to Postgres: %v", err)
	}

	memcachedClient := memcache.New(memcachedURL)

	// 2. dependency injection
	tokenMaker := token.NewJWTMaker(jwtSecret)

	// repositories
	flightRepo := repository.NewPostgresFlightRepository(dbConn)
	cacheRepo := authrepo.NewMemcachedRepository(memcachedClient)

	// usecases
	flightUC := usecase.NewFlightUseCase(flightRepo)

	// handlers
	flightHandler := flightgrpc.NewFlightHandler(flightUC)

	// interceptor
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, cacheRepo, roleRepo)

	// 3. start grpc server on the main thread
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)

	flightpb.RegisterFlightServiceServer(gRPCServer, flightHandler)

	// listen and serve on port 50054
	listener, err := net.Listen("tcp", ":50054")
	if err != nil {
		log.Fatalf("Failed to listen on port 50054: %v", err)
	}

	log.Printf("✅ Flight Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
