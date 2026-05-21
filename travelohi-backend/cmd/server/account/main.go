package main

import (
	"log"
	"net"
	"os"

	"github.com/bradfitz/gomemcache/memcache"
	"google.golang.org/grpc"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	// account services
	"github.com/travelohi/backend/internal/account/handler"
	"github.com/travelohi/backend/internal/account/repository"
	"github.com/travelohi/backend/internal/account/usecase"

	authrepo "github.com/travelohi/backend/internal/auth/repository"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/token"
	accountpb "github.com/travelohi/backend/proto/account/v1"
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
	accountRepo := repository.NewPostgresAccountRepository(dbConn)
	bookingRepo := repository.NewPostgresBookingRepository(dbConn)
	cacheRepo := authrepo.NewMemcachedRepository(memcachedClient)

	// usecase
	accountUseCase := usecase.NewAccountUseCase(accountRepo, bookingRepo)

	// handler
	accountHandler := handler.NewUserGrpcHandler(accountUseCase)

	// the bouncer (interceptor)
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, cacheRepo, roleRepo)

	// grpc server
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)
	accountpb.RegisterAccountServiceServer(gRPCServer, accountHandler)

	// start listening
	listener, err := net.Listen("tcp", ":50052")
	if err != nil {
		log.Fatalf("Failed to listen on port 50052: %v", err)
	}

	log.Printf("✅ Account Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
