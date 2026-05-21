package handler

import (
	"context"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/travelohi/backend/internal/game"
	gamepb "github.com/travelohi/backend/proto/game/v1"
	"google.golang.org/protobuf/proto"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type TokenVerifier interface {
	VerifyToken(tokenString string) (string, string, error)
}

type GameWebSocketHandler struct {
	matchUseCase  game.MatchmakingUseCase
	roomUseCase   game.RoomUseCase
	tokenVerifier TokenVerifier
}

func NewGameWebSocketHandler(matchUseCase game.MatchmakingUseCase, roomUseCase game.RoomUseCase, verifier TokenVerifier) *GameWebSocketHandler {
	return &GameWebSocketHandler{
		matchUseCase:  matchUseCase,
		roomUseCase:   roomUseCase,
		tokenVerifier: verifier,
	}
}

func (h *GameWebSocketHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// authenticate via query parameter
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		http.Error(w, "Unauthorized: missing token", http.StatusUnauthorized)
		return
	}

	userID, _, err := h.tokenVerifier.VerifyToken(tokenString)
	if err != nil {
		http.Error(w, "Unauthorized: invalid token", http.StatusUnauthorized)
		return
	}

	// upgrade to websocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Game Handler] Failed to upgrade websocket: %v", err)
		return
	}

	player := &game.Player{
		UserID: userID,
		Conn:   conn,
	}

	// start listening loop
	go h.listen(r.Context(), player)
}

func (h *GameWebSocketHandler) listen(ctx context.Context, player *game.Player) {
	defer func() {
		player.Conn.Close()
		h.matchUseCase.HandleDisconnect(player.UserID)
		h.roomUseCase.HandleDisconnect(player.UserID)
	}()

	for {
		// read message from websocket
		messageType, payloadBytes, err := player.Conn.ReadMessage()
		if err != nil {
			log.Printf("[Game Handler] User %s disconnected: %v", player.UserID, err)
			return
		}

		if messageType != websocket.BinaryMessage {
			log.Printf("[Game Handler] Warning: Non-binary message received from %s, ignoring.", player.UserID)
			continue
		}

		// unmarshal protobuf
		var clientEvent gamepb.GameClientEvent
		if err := proto.Unmarshal(payloadBytes, &clientEvent); err != nil {
			log.Printf("[Game Handler] Failed to unmarshal protobuf from %s: %v", player.UserID, err)
			continue
		}

		switch clientEvent.Payload.(type) {
		case *gamepb.GameClientEvent_JoinQueue:
			if err := h.matchUseCase.HandleJoinQueue(ctx, player); err != nil {
				return
			}

		case *gamepb.GameClientEvent_Action:
			// forward action to room usecase
			actionPayload := clientEvent.GetAction()
			if actionPayload != nil {
				err := h.roomUseCase.ProcessAction(actionPayload.GetRoomId(), player.UserID, actionPayload.GetActionType())
				if err != nil {
					log.Printf("[Game Handler] Dropped action from %s: %v", player.UserID, err)
				}
			}
		}
	}
}
