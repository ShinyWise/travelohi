package main

import (
	"log"
	"net"
	"os"

	"github.com/bradfitz/gomemcache/memcache"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/travelohi/backend/internal/auth/handler"
	"github.com/travelohi/backend/internal/auth/repository"
	"github.com/travelohi/backend/internal/auth/usecase"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/hash"
	"github.com/travelohi/backend/pkg/id"
	"github.com/travelohi/backend/pkg/token"
	accountpb "github.com/travelohi/backend/proto/account/v1"
	authpb "github.com/travelohi/backend/proto/auth/v1"
)

func main() {
	// environment variables
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

	// account service connection
	accountConn, err := grpc.Dial("account-service:50052", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to Account Service: %v", err)
	}
	defer accountConn.Close()
	accountClient := accountpb.NewAccountServiceClient(accountConn)

	// Dependency Injection
	tokenMaker := token.NewJWTMaker(jwtSecret)
	hasher := hash.NewBcryptHasher()
	idGen := id.NewUUIDGenerator()

	// repository
	authRepo := repository.NewPostgresAuthRepository(dbConn)
	cacheRepo := repository.NewMemcachedRepository(memcachedClient)

	// usecase
	authUseCase := usecase.NewAuthUseCase(authRepo, cacheRepo, accountClient, hasher, idGen, tokenMaker)

	// handler
	authHandler := handler.NewAuthHandler(authUseCase)

	// interceptor
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, cacheRepo)

	// grpc server
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)

	// register auth service server
	authpb.RegisterAuthServiceServer(gRPCServer, authHandler)

	// start listening
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen on port 50051: %v", err)
	}

	log.Printf("✅ Auth Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
