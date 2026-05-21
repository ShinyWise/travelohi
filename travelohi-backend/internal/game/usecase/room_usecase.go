package usecase

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/travelohi/backend/internal/game"
	gamepb "github.com/travelohi/backend/proto/game/v1"
	"google.golang.org/protobuf/proto"
)

type playerAction struct {
	UserID     string
	ActionType string
}

type gameRoom struct {
	ID         string
	P1         *game.Player
	P2         *game.Player
	HP1        int32
	HP2        int32
	Timer      int32
	ActionChan chan playerAction
	CancelFunc context.CancelFunc
}

type roomUseCase struct {
	repo  game.Repository
	mu    sync.RWMutex
	rooms map[string]*gameRoom
}

func NewRoomUseCase(repo game.Repository) game.RoomUseCase {
	return &roomUseCase{
		repo:  repo,
		rooms: make(map[string]*gameRoom),
	}
}

func (u *roomUseCase) StartRoom(roomID string, p1, p2 *game.Player) {
	ctx, cancel := context.WithCancel(context.Background())

	room := &gameRoom{
		ID:         roomID,
		P1:         p1,
		P2:         p2,
		HP1:        100,
		HP2:        100,
		Timer:      60,
		ActionChan: make(chan playerAction, 50),
		CancelFunc: cancel,
	}

	u.mu.Lock()
	u.rooms[roomID] = room
	u.mu.Unlock()

	// launch game loop
	go u.runGameLoop(ctx, room)
}

func (u *roomUseCase) ProcessAction(roomID, userID, actionType string) error {
	u.mu.RLock()
	room, exists := u.rooms[roomID]
	u.mu.RUnlock()

	if !exists {
		return fmt.Errorf("room %s not found or already ended", roomID)
	}

	// send to action channel
	select {
	case room.ActionChan <- playerAction{UserID: userID, ActionType: actionType}:
		return nil
	default:
		return fmt.Errorf("room %s action buffer full (rate limit prevention)", roomID)
	}
}

func (u *roomUseCase) HandleDisconnect(userID string) {
	u.mu.RLock()
	var targetRoom *gameRoom
	for _, room := range u.rooms {
		if room.P1.UserID == userID || room.P2.UserID == userID {
			targetRoom = room
			break
		}
	}
	u.mu.RUnlock()

	if targetRoom != nil {
		select {
		case targetRoom.ActionChan <- playerAction{UserID: userID, ActionType: "disconnect"}:
		default:
		}
	}
}

func (u *roomUseCase) runGameLoop(ctx context.Context, room *gameRoom) {
	defer u.cleanupRoom(room)

	// tick every 1 second
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return

		case <-ticker.C:
			room.Timer--
			u.broadcastState(room)
			if room.Timer <= 0 {
				u.endMatch(ctx, room, "time_up")
				return
			}

		case action := <-room.ActionChan:
			if action.ActionType == "disconnect" {
				if action.UserID == room.P1.UserID {
					room.HP1 = 0
				} else if action.UserID == room.P2.UserID {
					room.HP2 = 0
				}
				u.endMatch(ctx, room, "opponent_disconnected")
				return
			}

			// damage calculation
			damage := int32(0)
			switch action.ActionType {
			case "low_kick":
				damage = 15
			case "front_kick":
				damage = 10
			}

			// apply damage
			if action.UserID == room.P1.UserID {
				room.HP2 -= damage
			} else if action.UserID == room.P2.UserID {
				room.HP1 -= damage
			}

			// broadcast updated state
			u.broadcastState(room)

			// check for knockout
			if room.HP1 <= 0 || room.HP2 <= 0 {
				u.endMatch(ctx, room, "knockout")
				return
			}
		}
	}
}

func (u *roomUseCase) endMatch(ctx context.Context, room *gameRoom, reason string) {
	winnerID := ""

	// determine logic based on remaining hp
	if room.HP1 > room.HP2 {
		winnerID = room.P1.UserID
	} else if room.HP2 > room.HP1 {
		winnerID = room.P2.UserID
	}

	// save to db
	matchResult := &game.MatchResult{
		ID:              uuid.New().String(),
		PlayerOneID:     room.P1.UserID,
		PlayerTwoID:     room.P2.UserID,
		WinnerID:        winnerID,
		DurationSeconds: 60 - int(room.Timer),
	}

	if err := u.repo.SaveMatchResult(context.Background(), matchResult); err != nil {
		log.Printf("[Game Loop] Failed to save match result for room %s: %v", room.ID, err)
	}

	// broadcast end event
	endEvent := &gamepb.GameServerEvent{
		Payload: &gamepb.GameServerEvent_MatchEnd{
			MatchEnd: &gamepb.MatchEndEvent{
				WinnerId: winnerID,
				Reason:   reason,
			},
		},
	}
	u.sendToPlayer(room.P1, endEvent)
	u.sendToPlayer(room.P2, endEvent)
}

func (u *roomUseCase) broadcastState(room *gameRoom) {
	stateEvent := &gamepb.GameServerEvent{
		Payload: &gamepb.GameServerEvent_StateUpdate{
			StateUpdate: &gamepb.GameStateUpdate{
				PlayerOneHp:   room.HP1,
				PlayerTwoHp:   room.HP2,
				TimeRemaining: room.Timer,
			},
		},
	}
	u.sendToPlayer(room.P1, stateEvent)
	u.sendToPlayer(room.P2, stateEvent)
}

func (u *roomUseCase) sendToPlayer(player *game.Player, event *gamepb.GameServerEvent) {
	if bytes, err := proto.Marshal(event); err == nil {
		_ = player.Conn.WriteMessage(websocket.BinaryMessage, bytes)
	}
}

func (u *roomUseCase) cleanupRoom(room *gameRoom) {
	u.mu.Lock()
	delete(u.rooms, room.ID)
	u.mu.Unlock()

	_ = room.P1.Conn.Close()
	_ = room.P2.Conn.Close()
	log.Printf("[Game Loop] Room %s closed and cleaned up.", room.ID)
}
