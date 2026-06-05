package game

import (
	"context"
	"time"

	"github.com/gorilla/websocket"
)

type Player struct {
	UserID string
	Conn   *websocket.Conn
}

type MatchResult struct {
	ID              string
	PlayerOneID     string
	PlayerTwoID     string
	WinnerID        string
	DurationSeconds int
}

type CacheRepository interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

type MatchmakingUseCase interface {
	HandleJoinQueue(ctx context.Context, player *Player) error
	HandleDisconnect(userID string)
	BroadcastQueueState()
}

type Repository interface {
	SaveMatchResult(ctx context.Context, result *MatchResult) error
	GetUsernameByID(ctx context.Context, userID string) (string, error)
	AwardPrize(ctx context.Context, userID string, amount int64) error
}

// buat manage active game instances
type RoomUseCase interface {
	StartRoom(roomID string, p1, p2 *Player)
	ProcessAction(roomID, userID, actionType string) error
	HandleDisconnect(userID string)
	GetActiveRoomCount() int
}
