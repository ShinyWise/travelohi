// cmd/cart/main.go
package main

import (
	"context"
	"log"
	"net"
	"os"

	"github.com/bradfitz/gomemcache/memcache"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	authrepo "github.com/travelohi/backend/internal/auth/repository"
	carthandler "github.com/travelohi/backend/internal/cart/handler"
	"github.com/travelohi/backend/internal/cart/repository"
	"github.com/travelohi/backend/internal/cart/usecase"
	"github.com/travelohi/backend/internal/cart/worker"
	"github.com/travelohi/backend/internal/interceptor"
	"github.com/travelohi/backend/pkg/mailer"
	"github.com/travelohi/backend/pkg/token"
	accountpb "github.com/travelohi/backend/proto/account/v1"
	cartpb "github.com/travelohi/backend/proto/cart/v1"
	flightpb "github.com/travelohi/backend/proto/flight/v1"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	memcachedURL := os.Getenv("MEMCACHED_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	flightServiceURL := os.Getenv("FLIGHT_SERVICE_URL")
	accountServiceURL := os.Getenv("ACCOUNT_SERVICE_URL")

	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	dbConn, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to Postgres: %v", err)
	}

	memcachedClient := memcache.New(memcachedURL)

	flightConn, err := grpc.NewClient(flightServiceURL, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to create Flight Service client: %v", err)
	}
	defer flightConn.Close()
	flightClient := flightpb.NewFlightServiceClient(flightConn)

	accountConn, err := grpc.NewClient(accountServiceURL, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to create Account Service client: %v", err)
	}
	defer accountConn.Close()
	accountClient := accountpb.NewAccountServiceClient(accountConn)

	tokenMaker := token.NewJWTMaker(jwtSecret)

	cartRepo := repository.NewPostgresCartRepository(dbConn)
	cacheRepo := authrepo.NewMemcachedRepository(memcachedClient)
	promoCacheRepo := repository.NewPromoMemcachedRepository(memcachedClient)

	smtpMailer := mailer.NewSMTPMailer(smtpHost, smtpPort, smtpUser, smtpPass)

	cartUC := usecase.NewCartUseCase(cartRepo, flightClient, accountClient, smtpMailer, promoCacheRepo)

	cartHandler := carthandler.NewCartHandler(cartUC)

	// the bouncer (interceptor)
	roleRepo := authrepo.NewPostgresRoleRepository(dbConn)
	authInterceptor := interceptor.NewAuthInterceptor(tokenMaker, cacheRepo, roleRepo)

	workerCtx, cancel := context.WithCancel(context.Background())
	defer cancel()
	worker.StartCartSweeper(workerCtx, dbConn, flightClient)

	gRPCServer := grpc.NewServer(
		grpc.UnaryInterceptor(authInterceptor.Unary()),
	)
	cartpb.RegisterCartServiceServer(gRPCServer, cartHandler)

	listener, err := net.Listen("tcp", ":50055")
	if err != nil {
		log.Fatalf("Failed to listen on port 50055: %v", err)
	}

	log.Printf("✅ Cart Service is running on %v", listener.Addr())

	if err := gRPCServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
