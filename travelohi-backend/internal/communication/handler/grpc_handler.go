package handler

import (
	"context"
	"log"

	"github.com/travelohi/backend/internal/communication"
	"github.com/travelohi/backend/internal/interceptor"
	communicationpb "github.com/travelohi/backend/proto/communication/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type CommunicationHandler struct {
	communicationpb.UnimplementedCommunicationServiceServer
	hub         communication.HubUseCase
	chatUseCase communication.ChatUseCase
}

func NewCommunicationHandler(hub communication.HubUseCase, chatUseCase communication.ChatUseCase) *CommunicationHandler {
	return &CommunicationHandler{
		hub:         hub,
		chatUseCase: chatUseCase,
	}
}

func (h *CommunicationHandler) StreamChat(req *communicationpb.StreamChatRequest, stream communicationpb.CommunicationService_StreamChatServer) error {
	ctx := stream.Context()

	// extract user id securely from JWT
	userIDObj := ctx.Value(interceptor.UserIDKey)
	if userIDObj == nil {
		return status.Errorf(codes.Unauthenticated, "unauthorized chat access")
	}
	userID := userIDObj.(string)

	conversationID := req.GetConversationId()
	if conversationID == "" {
		return status.Errorf(codes.InvalidArgument, "conversation_id is required to join a room")
	}

	// setup channel and register
	sendCh := make(chan *communicationpb.ChatEvent, 50)
	h.hub.Register(conversationID, userID, sendCh)

	// unregister client on disconnect
	defer h.hub.Unregister(conversationID, userID, sendCh)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err() // client disconnect
		case msg, ok := <-sendCh:
			if !ok {
				return nil // tutup
			}
			if err := stream.Send(msg); err != nil {
				log.Printf("[StreamChat] Error pushing to user %s: %v", userID, err)
				return err
			}
		}
	}
}

func (h *CommunicationHandler) SendEvent(ctx context.Context, req *communicationpb.ChatEvent) (*communicationpb.SendEventResponse, error) {
	// extract user id securely
	userIDObj := ctx.Value(interceptor.UserIDKey)
	if userIDObj == nil {
		return nil, status.Errorf(codes.Unauthenticated, "unauthorized access")
	}
	userID := userIDObj.(string)

	req.SenderId = userID

	if req.GetConversationId() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "conversation_id is required")
	}

	res, err := h.chatUseCase.SendEvent(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to process event: %v", err)
	}

	return res, nil
}

func (h *CommunicationHandler) GetChatHistory(ctx context.Context, req *communicationpb.GetChatHistoryRequest) (*communicationpb.GetChatHistoryResponse, error) {
	if req.GetConversationId() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "conversation_id is required")
	}

	res, err := h.chatUseCase.GetChatHistory(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch chat history: %v", err)
	}

	return res, nil
}

func (h *CommunicationHandler) GetActiveConversations(ctx context.Context, req *communicationpb.GetActiveConversationsRequest) (*communicationpb.GetActiveConversationsResponse, error) {
	// extract user id
	userIDObj := ctx.Value(interceptor.UserIDKey)
	if userIDObj == nil {
		return nil, status.Errorf(codes.Unauthenticated, "unauthorized access")
	}
	adminID := userIDObj.(string)

	res, err := h.chatUseCase.GetActiveConversations(ctx, req, adminID)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (h *CommunicationHandler) GetOrCreateConversation(ctx context.Context, req *communicationpb.GetOrCreateConversationRequest) (*communicationpb.GetOrCreateConversationResponse, error) {
	userIDObj := ctx.Value(interceptor.UserIDKey)
	if userIDObj == nil {
		return nil, status.Errorf(codes.Unauthenticated, "unauthorized access")
	}
	userID := userIDObj.(string)

	req.UserId = userID

	res, err := h.chatUseCase.GetOrCreateConversation(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get or create conversation: %v", err)
	}

	return res, nil
}

func (h *CommunicationHandler) CloseConversation(ctx context.Context, req *communicationpb.CloseConversationRequest) (*communicationpb.CloseConversationResponse, error) {
	userIDObj := ctx.Value(interceptor.UserIDKey)
	if userIDObj == nil {
		return nil, status.Errorf(codes.Unauthenticated, "unauthorized access")
	}
	adminID := userIDObj.(string)

	if req.GetConversationId() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "conversation_id is required")
	}

	res, err := h.chatUseCase.CloseConversation(ctx, req, adminID)
	if err != nil {
		return nil, err
	}

	return res, nil
}
