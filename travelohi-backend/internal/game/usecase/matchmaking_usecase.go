package usecase

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/travelohi/backend/internal/game"
	gamepb "github.com/travelohi/backend/proto/game/v1"
	"google.golang.org/protobuf/proto"
)

type matchmakingUseCase struct {
	cache        game.CacheRepository
	roomUseCase  game.RoomUseCase
	repo         game.Repository
	mu           sync.Mutex
	waitingQueue []*game.Player
}

func NewMatchmakingUseCase(cache game.CacheRepository, roomUseCase game.RoomUseCase, repo game.Repository) game.MatchmakingUseCase {
	return &matchmakingUseCase{
		cache:        cache,
		roomUseCase:  roomUseCase,
		repo:         repo,
		waitingQueue: make([]*game.Player, 0),
	}
}

func (u *matchmakingUseCase) HandleJoinQueue(ctx context.Context, player *game.Player) error {
	rateLimitKey := "game_rate_limit:" + player.UserID
	var playCount int
	var expiry int64

	cachedBytes, err := u.cache.Get(ctx, rateLimitKey)
	if err == nil && cachedBytes != nil {
		parts := strings.Split(string(cachedBytes), ":")
		if len(parts) == 2 {
			playCount, _ = strconv.Atoi(parts[0])
			expiry, _ = strconv.ParseInt(parts[1], 10, 64)
		}
	}

	if expiry > 0 && time.Now().Unix() > expiry {
		playCount = 0
		expiry = 0
	}

	if playCount >= 3 {
		u.sendErrorPayload(player.Conn, "Rate limit exceeded: You can only play 3 times every 10 minutes.")
		return fmt.Errorf("rate limit exceeded for user %s", player.UserID)
	}

	playCount++
	var ttl time.Duration
	if expiry == 0 {
		// 10 menit window
		expiry = time.Now().Add(10 * time.Minute).Unix()
		ttl = 10 * time.Minute
	} else {
		ttl = time.Until(time.Unix(expiry, 0))
		if ttl <= 0 {
			ttl = time.Second
		}
	}

	val := fmt.Sprintf("%d:%d", playCount, expiry)
	_ = u.cache.Set(ctx, rateLimitKey, []byte(val), ttl)

	// add to matchmaking pool
	u.mu.Lock()
	u.waitingQueue = append(u.waitingQueue, player)
	log.Printf("[Matchmaking] User %s joined the queue. Total in queue: %d", player.UserID, len(u.waitingQueue))

	// check for a match
	if len(u.waitingQueue) >= 2 {
		p1 := u.waitingQueue[0]
		p2 := u.waitingQueue[1]

		u.waitingQueue = u.waitingQueue[2:]
		u.mu.Unlock()

		u.startMatch(p1, p2)
		return nil
	}
	u.mu.Unlock()

	return nil
}

func (u *matchmakingUseCase) startMatch(p1, p2 *game.Player) {
	roomID := uuid.New().String()
	log.Printf("[Matchmaking] Match found! Room %s created for %s vs %s", roomID, p1.UserID, p2.UserID)

	p1Username, err := u.repo.GetUsernameByID(context.Background(), p1.UserID)
	if err != nil || p1Username == "" {
		p1Username = "Opponent (" + p1.UserID + ")"
	}

	p2Username, err := u.repo.GetUsernameByID(context.Background(), p2.UserID)
	if err != nil || p2Username == "" {
		p2Username = "Opponent (" + p2.UserID + ")"
	}

	p1Event := &gamepb.GameServerEvent{
		Payload: &gamepb.GameServerEvent_MatchFound{
			MatchFound: &gamepb.MatchFoundEvent{
				RoomId:         roomID,
				OpponentName:   p2Username,
				StartCountdown: 3,
				IsPlayerOne:    true,
			},
		},
	}
	u.sendProtoMessage(p1.Conn, p1Event)

	p2Event := &gamepb.GameServerEvent{
		Payload: &gamepb.GameServerEvent_MatchFound{
			MatchFound: &gamepb.MatchFoundEvent{
				RoomId:         roomID,
				OpponentName:   p1Username,
				StartCountdown: 3,
				IsPlayerOne:    false,
			},
		},
	}
	u.sendProtoMessage(p2.Conn, p2Event)

	u.roomUseCase.StartRoom(roomID, p1, p2)
}

func (u *matchmakingUseCase) HandleDisconnect(userID string) {
	u.mu.Lock()
	defer u.mu.Unlock()

	for i, p := range u.waitingQueue {
		if p.UserID == userID {
			u.waitingQueue = append(u.waitingQueue[:i], u.waitingQueue[i+1:]...)
			log.Printf("[Matchmaking] Removed disconnected user %s from queue", userID)
			return
		}
	}
}

func (u *matchmakingUseCase) sendErrorPayload(conn *websocket.Conn, message string) {
	event := &gamepb.GameServerEvent{
		Payload: &gamepb.GameServerEvent_Error{
			Error: &gamepb.ErrorEvent{Message: message},
		},
	}
	u.sendProtoMessage(conn, event)
	_ = conn.Close()
}

func (u *matchmakingUseCase) sendProtoMessage(conn *websocket.Conn, event *gamepb.GameServerEvent) {
	bytes, err := proto.Marshal(event)
	if err != nil {
		log.Printf("[Matchmaking] Failed to marshal protobuf: %v", err)
		return
	}
	if err := conn.WriteMessage(websocket.BinaryMessage, bytes); err != nil {
		log.Printf("[Matchmaking] Failed to write to websocket: %v", err)
	}
}
