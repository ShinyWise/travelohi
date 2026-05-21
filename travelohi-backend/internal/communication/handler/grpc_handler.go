package handler

import (
	"context"
	"io"
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

func (h *CommunicationHandler) StreamChat(stream communicationpb.CommunicationService_StreamChatServer) error {
	ctx := stream.Context()

	// extract user id
	userIDObj := ctx.Value(interceptor.UserIDKey)
	if userIDObj == nil {
		return status.Errorf(codes.Unauthenticated, "unauthorized chat access")
	}
	userID := userIDObj.(string)

	// initial connection payload
	firstEvent, err := stream.Recv()
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "failed to read initial chat payload: %v", err)
	}

	conversationID := firstEvent.GetConversationId()
	if conversationID == "" {
		return status.Errorf(codes.InvalidArgument, "conversation_id is required to join a room")
	}

	// setup channel and register
	sendCh := make(chan *communicationpb.ChatEvent, 50)
	h.hub.Register(conversationID, userID, sendCh)

	// unregister client on disconnect
	defer h.hub.Unregister(conversationID, userID)

	firstEvent.SenderId = userID
	if err := h.chatUseCase.ProcessIncomingEvent(ctx, firstEvent); err != nil {
		log.Printf("[StreamChat] Failed to process initial event for DB: %v", err)
	}

	// channels for error handling
	errCh := make(chan error, 1)

	// goroutine 1: sender
	go func() {
		for {
			select {
			case <-ctx.Done():
				errCh <- ctx.Err()
				return
			case msg, ok := <-sendCh:
				if !ok {
					errCh <- nil
					return
				}
				if err := stream.Send(msg); err != nil {
					log.Printf("[StreamChat] Error sending to user %s: %v", userID, err)
					errCh <- err
					return
				}
			}
		}
	}()

	// goroutine 2: receiver
	go func() {
		for {
			event, err := stream.Recv()
			if err != nil {
				if err == io.EOF {
					errCh <- nil
					return
				}
				log.Printf("[StreamChat] Error receiving from user %s: %v", userID, err)
				errCh <- err
				return
			}

			event.SenderId = userID

			if err := h.chatUseCase.ProcessIncomingEvent(ctx, event); err != nil {
				log.Printf("[StreamChat] Failed to process event for DB: %v", err)
			}
		}
	}()

	// wait for stream completion
	err = <-errCh
	return err
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
