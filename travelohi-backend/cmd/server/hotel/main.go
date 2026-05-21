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
	hotelgrpc "github.com/travelohi/backend/internal/hotel/handler"
	"github.com/travelohi/backend/internal/hotel/repository"
	"github.com/travelohi/backend/internal/hotel/usecase"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/token"
	hotelpb "github.com/travelohi/backend/proto/hotel/v1"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	memcachedURL := os.Getenv("MEMCACHED_URL")
	jwtSecret := os.Getenv("JWT_SECRET")

	// infrastructure connections
	dbConn, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to Postgres: %v", err)
	}

	// memcached connection
	memcachedClient := memcache.New(memcachedURL)

	// dependency injection
	tokenMaker := token.NewJWTMaker(jwtSecret)

	// repository
	hotelRepo := repository.NewPostgresHotelRepository(dbConn)
	cacheRepo := authrepo.NewMemcachedRepository(memcachedClient)
	// usecase
	hotelUC := usecase.NewHotelUseCase(hotelRepo)

	// handler
	hotelHandler := hotelgrpc.NewHotelHandler(hotelUC)

	// the bouncer (interceptor)
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, cacheRepo, roleRepo)

	// grpc server
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)
	hotelpb.RegisterHotelServiceServer(gRPCServer, hotelHandler)

	// start listening
	listener, err := net.Listen("tcp", ":50053")
	if err != nil {
		log.Fatalf("Failed to listen on port 50053: %v", err)
	}

	log.Printf("✅ Hotel Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
