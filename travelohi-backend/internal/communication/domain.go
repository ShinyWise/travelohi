package communication

import (
	"context"
	"time"

	communicationpb "github.com/travelohi/backend/proto/communication/v1"
)

type Message struct {
	ID             string
	ConversationID string
	SenderID       string
	Content        string
	Status         string // sent, seen
	CreatedAt      time.Time
}

type ConversationPreview struct {
	ConversationID         string
	UserID                 string
	FullName               string
	ProfilePictureUrl      string
	LatestMessageContent   string
	LatestMessageTimestamp time.Time
	UnreadCount            int32
}

type HubUseCase interface {
	Register(conversationID, userID string, sendCh chan *communicationpb.ChatEvent)
	Unregister(conversationID, userID string, sendCh chan *communicationpb.ChatEvent)
	RouteEvent(event *communicationpb.ChatEvent)
}

type Repository interface {
	SaveMessage(ctx context.Context, msg *Message) error
	UpdateMessageStatus(ctx context.Context, messageID string, status string) error
	GetMessages(ctx context.Context, conversationID string, limit, offset int32) ([]*Message, error)
	GetActiveConversations(ctx context.Context, searchQuery string, limit, offset int32) ([]*ConversationPreview, int32, error)
	IsUserAdmin(ctx context.Context, userID string) (bool, error)
	GetOrCreateConversation(ctx context.Context, userID string, createIfNotExist bool) (string, error)
	CloseConversation(ctx context.Context, conversationID string) error
}

type ChatUseCase interface {
	SendEvent(ctx context.Context, event *communicationpb.ChatEvent) (*communicationpb.SendEventResponse, error)
	GetChatHistory(ctx context.Context, req *communicationpb.GetChatHistoryRequest) (*communicationpb.GetChatHistoryResponse, error)
	GetActiveConversations(ctx context.Context, req *communicationpb.GetActiveConversationsRequest, adminID string) (*communicationpb.GetActiveConversationsResponse, error)
	GetOrCreateConversation(ctx context.Context, req *communicationpb.GetOrCreateConversationRequest) (*communicationpb.GetOrCreateConversationResponse, error)
	CloseConversation(ctx context.Context, req *communicationpb.CloseConversationRequest, adminID string) (*communicationpb.CloseConversationResponse, error)
}
