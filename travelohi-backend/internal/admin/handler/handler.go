package handler

import (
	"context"

	"github.com/travelohi/backend/internal/admin"
	adminpb "github.com/travelohi/backend/proto/admin/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AdminHandler struct {
	adminpb.UnimplementedAdminServiceServer
	usecase admin.UseCase
}

func NewAdminHandler(usecase admin.UseCase) *AdminHandler {
	return &AdminHandler{
		usecase: usecase,
	}
}

func (h *AdminHandler) InsertHotel(ctx context.Context, req *adminpb.InsertHotelRequest) (*adminpb.AdminResponse, error) {
	if req.GetName() == "" || req.GetStartingPrice() <= 0 {
		return nil, status.Errorf(codes.InvalidArgument, "hotel name and starting price are required")
	}

	err := h.usecase.InsertHotel(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to insert hotel: %v", err)
	}

	return &adminpb.AdminResponse{
		Success: true,
		Message: "Hotel successfully ingested into inventory",
	}, nil
}

func (h *AdminHandler) InsertAirline(ctx context.Context, req *adminpb.InsertAirlineRequest) (*adminpb.AdminResponse, error) {
	if req.GetName() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "airline name is required")
	}

	err := h.usecase.InsertAirline(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to insert airline: %v", err)
	}

	return &adminpb.AdminResponse{
		Success: true,
		Message: "Airline successfully ingested into inventory",
	}, nil
}

func (h *AdminHandler) CreatePromo(ctx context.Context, req *adminpb.CreatePromoRequest) (*adminpb.AdminResponse, error) {
	if req.GetPromoCode() == "" || req.GetDiscountAmount() <= 0 {
		return nil, status.Errorf(codes.InvalidArgument, "invalid promo details provided")
	}

	err := h.usecase.CreatePromo(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create promo (check for duplicate codes): %v", err)
	}

	return &adminpb.AdminResponse{
		Success: true,
		Message: "Promo code successfully generated",
	}, nil
}

func (h *AdminHandler) TogglePromoStatus(ctx context.Context, req *adminpb.TogglePromoRequest) (*adminpb.AdminResponse, error) {
	if req.GetPromoId() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "promo_id is required")
	}

	err := h.usecase.TogglePromoStatus(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update promo status: %v", err)
	}

	state := "disabled"
	if req.GetIsActive() {
		state = "activated"
	}

	return &adminpb.AdminResponse{
		Success: true,
		Message: "Promo successfully " + state,
	}, nil
}

func (h *AdminHandler) GetAllPromos(ctx context.Context, req *adminpb.GetAllPromosRequest) (*adminpb.GetAllPromosResponse, error) {
	res, err := h.usecase.GetAllPromos(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch promos: %v", err)
	}
	return res, nil
}

func (h *AdminHandler) GetAllUsers(ctx context.Context, req *adminpb.GetAllUsersRequest) (*adminpb.GetAllUsersResponse, error) {
	res, err := h.usecase.GetAllUsers(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch users: %v", err)
	}

	return res, nil
}

func (h *AdminHandler) BanUser(ctx context.Context, req *adminpb.BanUserRequest) (*adminpb.AdminResponse, error) {
	if req.GetUserId() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "user_id is required")
	}

	err := h.usecase.BanUser(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to process ban action: %v", err)
	}

	action := "unbanned"
	if req.GetBanStatus() {
		action = "banned and logged out"
	}

	return &adminpb.AdminResponse{
		Success: true,
		Message: "User successfully " + action,
	}, nil
}

func (h *AdminHandler) SendBroadcast(ctx context.Context, req *adminpb.SendBroadcastRequest) (*adminpb.AdminResponse, error) {
	if req.GetSubject() == "" || req.GetBody() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "subject and body are required")
	}

	err := h.usecase.SendBroadcast(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to dispatch broadcast: %v", err)
	}

	return &adminpb.AdminResponse{
		Success: true,
		Message: "Broadcast dispatched to background worker",
	}, nil
}
