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
	"github.com/travelohi/backend/internal/interceptor"
	telemetryhandler "github.com/travelohi/backend/internal/telemetry/handler"
	"github.com/travelohi/backend/internal/telemetry/repository"
	"github.com/travelohi/backend/internal/telemetry/usecase"
	"github.com/travelohi/backend/pkg/token"
	telemetrypb "github.com/travelohi/backend/proto/telemetry/v1"
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
	telemetryRepo := repository.NewPostgresTelemetryRepository(dbConn)
	telemetryCache := repository.NewMemcachedRepository(memcachedClient)
	authCacheRepo := authrepo.NewMemcachedRepository(memcachedClient)

	// usecases
	telemetryUC := usecase.NewTelemetryUseCase(telemetryRepo, telemetryCache)

	// handlers
	telemetryHandler := telemetryhandler.NewTelemetryHandler(telemetryUC)

	// interceptor
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, authCacheRepo, roleRepo)

	// 3. start grpc server
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)

	telemetrypb.RegisterTelemetryServiceServer(gRPCServer, telemetryHandler)

	// listen and serve on port 50057
	listener, err := net.Listen("tcp", ":50057")
	if err != nil {
		log.Fatalf("Failed to listen on port 50057: %v", err)
	}

	log.Printf("✅ Telemetry Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
