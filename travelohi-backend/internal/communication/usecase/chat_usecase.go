package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/communication"
	communicationpb "github.com/travelohi/backend/proto/communication/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type chatUseCase struct {
	repo communication.Repository
	hub  communication.HubUseCase
}

func NewChatUseCase(repo communication.Repository, hub communication.HubUseCase) communication.ChatUseCase {
	return &chatUseCase{
		repo: repo,
		hub:  hub,
	}
}

func (u *chatUseCase) ProcessIncomingEvent(ctx context.Context, event *communicationpb.ChatEvent) error {
	// identify payload type
	switch payload := event.EventPayload.(type) {

	case *communicationpb.ChatEvent_Message:

		msgID := payload.Message.GetMessageId()
		if msgID == "" {
			msgID = uuid.New().String()
			payload.Message.MessageId = msgID
		}

		payload.Message.Timestamp = time.Now().Format(time.RFC3339)

		// save message
		domainMsg := &communication.Message{
			ID:             msgID,
			ConversationID: event.GetConversationId(),
			SenderID:       event.GetSenderId(),
			Content:        payload.Message.GetContent(),
		}

		if err := u.repo.SaveMessage(ctx, domainMsg); err != nil {
			return err
		}

	case *communicationpb.ChatEvent_ReadReceipt:
		// update status
		if err := u.repo.UpdateMessageStatus(ctx, payload.ReadReceipt.GetMessageId(), payload.ReadReceipt.GetNewStatus()); err != nil {
			return err
		}

	case *communicationpb.ChatEvent_TypingIndicator:

	}

	// broadcast event di hub
	u.hub.RouteEvent(event)

	return nil
}

func (u *chatUseCase) GetChatHistory(ctx context.Context, req *communicationpb.GetChatHistoryRequest) (*communicationpb.GetChatHistoryResponse, error) {
	limit := req.GetLimit()
	if limit <= 0 {
		limit = 20
	}

	domainMessages, err := u.repo.GetMessages(ctx, req.GetConversationId(), limit, req.GetOffset())
	if err != nil {
		return nil, err
	}

	var pbMessages []*communicationpb.MessagePayload
	for _, m := range domainMessages {
		pbMessages = append(pbMessages, &communicationpb.MessagePayload{
			MessageId: m.ID,
			Content:   m.Content,
			Timestamp: m.CreatedAt.Format(time.RFC3339),
		})
	}

	return &communicationpb.GetChatHistoryResponse{
		Messages: pbMessages,
	}, nil
}

func (u *chatUseCase) GetActiveConversations(ctx context.Context, req *communicationpb.GetActiveConversationsRequest, adminID string) (*communicationpb.GetActiveConversationsResponse, error) {
	// enforce rbac
	isAdmin, err := u.repo.IsUserAdmin(ctx, adminID)
	if err != nil || !isAdmin {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied: administrator privileges required")
	}

	// default pagination
	limit := req.GetLimit()
	if limit <= 0 {
		limit = 20
	}

	// fetch active conversations
	domainConvos, total, err := u.repo.GetActiveConversations(ctx, req.GetSearchQuery(), limit, req.GetOffset())
	if err != nil {
		return nil, err
	}

	// map to protobuf
	var pbConvos []*communicationpb.ConversationPreview
	for _, c := range domainConvos {
		timestampStr := ""
		// handle zero timestamps
		if !c.LatestMessageTimestamp.IsZero() {
			timestampStr = c.LatestMessageTimestamp.Format(time.RFC3339)
		}

		pbConvos = append(pbConvos, &communicationpb.ConversationPreview{
			ConversationId:         c.ConversationID,
			UserId:                 c.UserID,
			FullName:               c.FullName,
			LatestMessageContent:   c.LatestMessageContent,
			LatestMessageTimestamp: timestampStr,
			UnreadCount:            c.UnreadCount,
		})
	}

	return &communicationpb.GetActiveConversationsResponse{
		Conversations: pbConvos,
		TotalActive:   total,
	}, nil
}
