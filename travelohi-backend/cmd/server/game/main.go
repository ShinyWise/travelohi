package main

import (
	"log"
	"net/http"
	"os"

	"github.com/bradfitz/gomemcache/memcache"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/travelohi/backend/internal/game/handler"
	"github.com/travelohi/backend/internal/game/repository"
	"github.com/travelohi/backend/internal/game/usecase"
	"github.com/travelohi/backend/pkg/token"
)

func main() {
	dbURL := os.Getenv("DB_URL")
	memcachedURL := os.Getenv("MEMCACHED_URL")
	jwtSecret := os.Getenv("JWT_SECRET")
	port := os.Getenv("PORT")
	if port == "" {
		port = "50059"
	}

	// infrastructure connections
	dbConn, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to Postgres: %v", err)
	}

	memcachedClient := memcache.New(memcachedURL)

	// dependency injection
	tokenVerifier := token.NewJWTMaker(jwtSecret)

	// repositories
	gameRepo := repository.NewPostgresGameRepository(dbConn)
	cacheRepo := repository.NewMemcachedRepository(memcachedClient)

	// usecases
	roomUseCase := usecase.NewRoomUseCase(gameRepo)
	matchmakingUseCase := usecase.NewMatchmakingUseCase(cacheRepo, roomUseCase)

	// handlers
	gameHandler := handler.NewGameWebSocketHandler(matchmakingUseCase, roomUseCase, tokenVerifier)

	// start http/websocket server
	http.Handle("/ws/game", gameHandler)

	log.Printf("✅ Game Service is running on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to serve WebSocket server: %v", err)
	}
}
