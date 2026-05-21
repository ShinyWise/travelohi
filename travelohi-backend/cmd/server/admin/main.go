package main

import (
	"log"
	"net"
	"os"

	"github.com/bradfitz/gomemcache/memcache"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/travelohi/backend/internal/admin/handler"
	"github.com/travelohi/backend/internal/admin/repository"
	"github.com/travelohi/backend/internal/admin/usecase"
	"github.com/travelohi/backend/internal/admin/worker"
	authrepo "github.com/travelohi/backend/internal/auth/repository"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/token"
	adminpb "github.com/travelohi/backend/proto/admin/v1"
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
	adminRepo := repository.NewPostgresInventoryRepository(dbConn)
	cacheRepo := authrepo.NewMemcachedRepository(memcachedClient)

	// worker
	dispatcher := worker.NewNotificationDispatcher(adminRepo)

	// usecase
	adminUC := usecase.NewAdminUseCase(adminRepo, cacheRepo, dispatcher)

	// handler
	adminHandler := handler.NewAdminHandler(adminUC)

	// the bouncer (interceptor)
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, cacheRepo, roleRepo)

	// grpc server
	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)
	adminpb.RegisterAdminServiceServer(gRPCServer, adminHandler)

	// start listening
	listener, err := net.Listen("tcp", ":50056")
	if err != nil {
		log.Fatalf("Failed to listen on port 50056: %v", err)
	}

	log.Printf("✅ Admin Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
