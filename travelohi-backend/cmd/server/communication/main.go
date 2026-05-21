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
	communicationgrpc "github.com/travelohi/backend/internal/communication/handler"
	"github.com/travelohi/backend/internal/communication/repository"
	"github.com/travelohi/backend/internal/communication/usecase"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/token"
	communicationpb "github.com/travelohi/backend/proto/communication/v1"
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
	communicationRepo := repository.NewPostgresCommunicationRepository(dbConn)
	authCacheRepo := authrepo.NewMemcachedRepository(memcachedClient)

	// usecases
	hubUC := usecase.NewHubUseCase()
	chatUC := usecase.NewChatUseCase(communicationRepo, hubUC)

	// handlers
	communicationHandler := communicationgrpc.NewCommunicationHandler(hubUC, chatUC)

	// middleware
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, authCacheRepo, roleRepo)

	// 3. start grpc server
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
		grpc.StreamInterceptor(authInterceptor.Stream()),
	)

	communicationpb.RegisterCommunicationServiceServer(gRPCServer, communicationHandler)

	// listen and serve on port 50058
	listener, err := net.Listen("tcp", ":50058")
	if err != nil {
		log.Fatalf("Failed to listen on port 50058: %v", err)
	}

	log.Printf("✅ Communication Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
