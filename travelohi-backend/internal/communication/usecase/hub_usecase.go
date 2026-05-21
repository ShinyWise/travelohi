package usecase

import (
	"log"
	"sync"

	"github.com/travelohi/backend/internal/communication"
	communicationpb "github.com/travelohi/backend/proto/communication/v1"
)

type hubUseCase struct {
	mu sync.RWMutex
	// multi-dimensional map
	rooms map[string]map[string]chan *communicationpb.ChatEvent
}

func NewHubUseCase() communication.HubUseCase {
	return &hubUseCase{
		rooms: make(map[string]map[string]chan *communicationpb.ChatEvent),
	}
}

func (h *hubUseCase) Register(conversationID, userID string, sendCh chan *communicationpb.ChatEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// initialize room kalo ga ada
	if h.rooms[conversationID] == nil {
		h.rooms[conversationID] = make(map[string]chan *communicationpb.ChatEvent)
	}

	h.rooms[conversationID][userID] = sendCh
	log.Printf("[Chat Hub] User %s joined conversation %s", userID, conversationID)
}

func (h *hubUseCase) Unregister(conversationID, userID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, exists := h.rooms[conversationID]; exists {
		if ch, ok := room[userID]; ok {
			close(ch) // close channel
			delete(room, userID)
			log.Printf("[Chat Hub] User %s left conversation %s", userID, conversationID)
		}

		// delete empty room
		if len(room) == 0 {
			delete(h.rooms, conversationID)
		}
	}
}

func (h *hubUseCase) RouteEvent(event *communicationpb.ChatEvent) {
	h.mu.RLock() // read lock
	defer h.mu.RUnlock()

	room, exists := h.rooms[event.GetConversationId()]
	if !exists {
		return
	}

	// broadcast to other clients
	for uid, clientCh := range room {
		if uid != event.GetSenderId() {
			// non-blocking send
			select {
			case clientCh <- event:
				// routed
			default:
				log.Printf("[Chat Hub] WARNING: Dropping live message for user %s (buffer full)", uid)
			}
		}
	}
}
