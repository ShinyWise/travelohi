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
	ID           string
	P1           *game.Player
	P2           *game.Player
	HP1          int32
	HP2          int32
	Timer        int32
	ActionChan   chan playerAction
	CancelFunc   context.CancelFunc
	PlayerOneX   int32
	PlayerTwoX   int32
	PlayerOneY   int32
	PlayerTwoY   int32
	P1YVelocity  float64
	P2YVelocity  float64
	P1MoveState  string // "left", "right", "stop"
	P2MoveState  string // "left", "right", "stop"
	P1Action     string // "idle", "move", "jump", "low_kick", "front_kick"
	P2Action     string // "idle", "move", "jump", "low_kick", "front_kick"
	LastTick     time.Time
	LastAttackP1 time.Time
	LastAttackP2 time.Time
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
		ID:          roomID,
		P1:          p1,
		P2:          p2,
		HP1:         100,
		HP2:         100,
		Timer:       60,
		ActionChan:  make(chan playerAction, 50),
		CancelFunc:  cancel,
		PlayerOneX:  100,
		PlayerTwoX:  640,
		PlayerOneY:  300,
		PlayerTwoY:  300,
		P1MoveState: "stop",
		P2MoveState: "stop",
		P1Action:    "idle",
		P2Action:    "idle",
		LastTick:    time.Now(),
	}

	u.mu.Lock()
	u.rooms[roomID] = room
	u.mu.Unlock()

	go u.runGameLoop(ctx, room)
}

func (u *roomUseCase) ProcessAction(roomID, userID, actionType string) error {
	u.mu.RLock()
	room, exists := u.rooms[roomID]
	u.mu.RUnlock()

	if !exists {
		return fmt.Errorf("room %s not found or already ended", roomID)
	}

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

	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	var timerAccumulator float64
	for {
		select {
		case <-ctx.Done():
			return

		case <-ticker.C:
			u.updatePositions(room)
			
			timerAccumulator += 0.05
			if timerAccumulator >= 1.0 {
				room.Timer--
				timerAccumulator -= 1.0
			}

			isAirborne := room.PlayerOneY < 300 || room.PlayerTwoY < 300
			isMoving := room.P1MoveState != "stop" || room.P2MoveState != "stop" || isAirborne
			if isMoving || timerAccumulator < 0.05 {
				u.broadcastState(room)
			}

			if room.Timer <= 0 {
				u.endMatch(ctx, room, "time_up")
				return
			}

		case action := <-room.ActionChan:
			u.updatePositions(room)

			if action.ActionType == "disconnect" {
				if action.UserID == room.P1.UserID {
					room.HP1 = 0
				} else if action.UserID == room.P2.UserID {
					room.HP2 = 0
				}
				u.endMatch(ctx, room, "opponent_disconnected")
				return
			}

			if len(action.ActionType) > 13 && action.ActionType[:13] == "reset_action_" {
				act := action.ActionType[13:]
				if action.UserID == room.P1.UserID {
					if room.P1Action == act {
						if room.P1MoveState == "left" {
							room.P1Action = "move_left"
						} else if room.P1MoveState == "right" {
							room.P1Action = "move_right"
						} else {
							room.P1Action = "idle"
						}
					}
				} else if action.UserID == room.P2.UserID {
					if room.P2Action == act {
						if room.P2MoveState == "left" {
							room.P2Action = "move_left"
						} else if room.P2MoveState == "right" {
							room.P2Action = "move_right"
						} else {
							room.P2Action = "idle"
						}
					}
				}
				u.broadcastState(room)
				continue
			}

			if action.ActionType == "move_left" {
				if action.UserID == room.P1.UserID {
					room.P1MoveState = "left"
					room.P1Action = "move_left"
				} else if action.UserID == room.P2.UserID {
					room.P2MoveState = "left"
					room.P2Action = "move_left"
				}
			} else if action.ActionType == "move_right" {
				if action.UserID == room.P1.UserID {
					room.P1MoveState = "right"
					room.P1Action = "move_right"
				} else if action.UserID == room.P2.UserID {
					room.P2MoveState = "right"
					room.P2Action = "move_right"
				}
			} else if action.ActionType == "stop" {
				if action.UserID == room.P1.UserID {
					room.P1MoveState = "stop"
					room.P1Action = "idle"
				} else if action.UserID == room.P2.UserID {
					room.P2MoveState = "stop"
					room.P2Action = "idle"
				}
			}

			var actionName string
			switch action.ActionType {
			case "low_kick":
				actionName = "low_kick"
			case "front_kick":
				actionName = "front_kick"
			case "jump":
				actionName = "jump"
			}

			if actionName != "" {
				now := time.Now()
				if actionName == "low_kick" || actionName == "front_kick" {
					const cooldown = 400 * time.Millisecond
					if action.UserID == room.P1.UserID {
						if now.Sub(room.LastAttackP1) < cooldown {
							log.Printf("[Game Loop] Room %s: Player 1 attack rate limited (cooldown active)", room.ID)
							continue
						}
						room.LastAttackP1 = now
					} else if action.UserID == room.P2.UserID {
						if now.Sub(room.LastAttackP2) < cooldown {
							log.Printf("[Game Loop] Room %s: Player 2 attack rate limited (cooldown active)", room.ID)
							continue
						}
						room.LastAttackP2 = now
					}
				}

				if actionName == "jump" {
					if action.UserID == room.P1.UserID && room.PlayerOneY >= 300 {
						room.P1YVelocity = -400.0
					} else if action.UserID == room.P2.UserID && room.PlayerTwoY >= 300 {
						room.P2YVelocity = -400.0
					}
				}

				if action.UserID == room.P1.UserID {
					room.P1Action = actionName
				} else if action.UserID == room.P2.UserID {
					room.P2Action = actionName
				}

				if actionName != "jump" {
					go func(u *roomUseCase, r *gameRoom, uID string, act string) {
						time.Sleep(300 * time.Millisecond)
						_ = u.ProcessAction(r.ID, uID, "reset_action_"+act)
					}(u, room, action.UserID, actionName)
				}
			}

			damage := int32(0)
			if actionName == "low_kick" {
				damage = 15
			} else if actionName == "front_kick" {
				damage = 10
			}

			if damage > 0 {
				const playerWidth = 60
				const kickReach = 40

				var attackerX, defenderX int32
				var defenderAction string

				if action.UserID == room.P1.UserID {
					attackerX = room.PlayerOneX
					defenderX = room.PlayerTwoX
					defenderAction = room.P2Action
				} else {
					attackerX = room.PlayerTwoX
					defenderX = room.PlayerOneX
					defenderAction = room.P1Action
				}

				isFacingRight := attackerX <= defenderX

				var attackMinX, attackMaxX int32
				if isFacingRight {
					attackMinX = attackerX + playerWidth
					attackMaxX = attackerX + playerWidth + kickReach
				} else {
					attackMinX = attackerX - kickReach
					attackMaxX = attackerX
				}

				defenderMinX := defenderX
				defenderMaxX := defenderX + playerWidth

				hitLanded := attackMinX < defenderMaxX && attackMaxX > defenderMinX

				var defenderY int32
				if action.UserID == room.P1.UserID {
					defenderY = room.PlayerTwoY
				} else {
					defenderY = room.PlayerOneY
				}

				if hitLanded && actionName == "low_kick" && defenderY < 300 {
					hitLanded = false
				}

				if hitLanded {
					if action.UserID == room.P1.UserID {
						room.HP2 -= damage
						log.Printf("[Game Loop] Room %s: Player 1 hit Player 2 with %s for %d damage (HP2: %d)", room.ID, actionName, damage, room.HP2)
					} else {
						room.HP1 -= damage
						log.Printf("[Game Loop] Room %s: Player 2 hit Player 1 with %s for %d damage (HP1: %d)", room.ID, actionName, damage, room.HP1)
					}
				} else {
					log.Printf("[Game Loop] Room %s: %s attack by Player %s missed/evaded (AttackerX: %d, DefenderX: %d, DefenderAction: %s)", room.ID, actionName, action.UserID, attackerX, defenderX, defenderAction)
				}
			}

			u.broadcastState(room)

			if room.HP1 <= 0 || room.HP2 <= 0 {
				u.endMatch(ctx, room, "knockout")
				return
			}
		}
	}
}

func (u *roomUseCase) endMatch(ctx context.Context, room *gameRoom, reason string) {
	winnerID := ""

	if room.HP1 > room.HP2 {
		winnerID = room.P1.UserID
	} else if room.HP2 > room.HP1 {
		winnerID = room.P2.UserID
	}

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

	if winnerID != "" {
		const prizeAmount = 50000
		if err := u.repo.AwardPrize(context.Background(), winnerID, prizeAmount); err != nil {
			log.Printf("[Game Loop] Failed to award prize to user %s: %v", winnerID, err)
		} else {
			log.Printf("[Game Loop] Awarded %d prize to winner %s", prizeAmount, winnerID)
		}
	}

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

func (u *roomUseCase) updatePositions(room *gameRoom) {
	now := time.Now()
	elapsed := now.Sub(room.LastTick).Seconds()
	room.LastTick = now

	speed := 250.0
	const gravity = 1600.0
	const groundY = 300.0

	if room.P1MoveState == "left" {
		room.PlayerOneX = int32(float64(room.PlayerOneX) - speed*elapsed)
		if room.PlayerOneX < 0 {
			room.PlayerOneX = 0
		}
	} else if room.P1MoveState == "right" {
		room.PlayerOneX = int32(float64(room.PlayerOneX) + speed*elapsed)
		if room.PlayerOneX > 740 {
			room.PlayerOneX = 740
		}
	}

	if float64(room.PlayerOneY) < groundY || room.P1YVelocity != 0 {
		room.P1YVelocity += gravity * elapsed
		room.PlayerOneY = int32(float64(room.PlayerOneY) + room.P1YVelocity*elapsed)
		if float64(room.PlayerOneY) >= groundY {
			room.PlayerOneY = int32(groundY)
			room.P1YVelocity = 0
			if room.P1Action == "jump" {
				if room.P1MoveState == "left" {
					room.P1Action = "move_left"
				} else if room.P1MoveState == "right" {
					room.P1Action = "move_right"
				} else {
					room.P1Action = "idle"
				}
			}
		}
	}

	if room.P2MoveState == "left" {
		room.PlayerTwoX = int32(float64(room.PlayerTwoX) - speed*elapsed)
		if room.PlayerTwoX < 0 {
			room.PlayerTwoX = 0
		}
	} else if room.P2MoveState == "right" {
		room.PlayerTwoX = int32(float64(room.PlayerTwoX) + speed*elapsed)
		if room.PlayerTwoX > 740 {
			room.PlayerTwoX = 740
		}
	}

	if float64(room.PlayerTwoY) < groundY || room.P2YVelocity != 0 {
		room.P2YVelocity += gravity * elapsed
		room.PlayerTwoY = int32(float64(room.PlayerTwoY) + room.P2YVelocity*elapsed)
		if float64(room.PlayerTwoY) >= groundY {
			room.PlayerTwoY = int32(groundY)
			room.P2YVelocity = 0
			if room.P2Action == "jump" {
				if room.P2MoveState == "left" {
					room.P2Action = "move_left"
				} else if room.P2MoveState == "right" {
					room.P2Action = "move_right"
				} else {
					room.P2Action = "idle"
				}
			}
		}
	}
}

func (u *roomUseCase) broadcastState(room *gameRoom) {
	stateEvent := &gamepb.GameServerEvent{
		Payload: &gamepb.GameServerEvent_StateUpdate{
			StateUpdate: &gamepb.GameStateUpdate{
				PlayerOneHp:     room.HP1,
				PlayerTwoHp:     room.HP2,
				TimeRemaining:   room.Timer,
				PlayerOneX:      room.PlayerOneX,
				PlayerTwoX:      room.PlayerTwoX,
				PlayerOneAction: room.P1Action,
				PlayerTwoAction: room.P2Action,
				PlayerOneY:      room.PlayerOneY,
				PlayerTwoY:      room.PlayerTwoY,
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

func (u *roomUseCase) GetActiveRoomCount() int {
	u.mu.RLock()
	defer u.mu.RUnlock()
	return len(u.rooms)
}

