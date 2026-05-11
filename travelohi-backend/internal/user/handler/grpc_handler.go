package handler

import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/user"
	userpb "github.com/travelohi/backend/proto/user/v1"
)

type UserGrpcHandler struct {
	// ikutin gRPC forward-compability
	userpb.UnimplementedUserServiceServer
	userUsecase user.UserUseCase
}

func NewUserGrpcHandler(usecase user.UserUseCase) *UserGrpcHandler {
	return &UserGrpcHandler{
		userUsecase: usecase,
	}
}

func (h *UserGrpcHandler) GetUser(ctx context.Context, req *userpb.GetUserRequest) (*userpb.UserResponse, error) {
	if req.GetId() == "" {
		return nil, errors.New("id is required")
	}

	domainUser, err := h.userUsecase.GetUser(ctx, req.GetId())
	if err != nil {
		return nil, err
	}

	return &userpb.UserResponse{
		User: &userpb.User{
			Id:                domainUser.ID,
			Email:             domainUser.Email,
			FirstName:         domainUser.FirstName,
			LastName:          domainUser.LastName,
			Gender:            domainUser.Gender,
			Dob:               domainUser.DOB,
			ProfilePictureUrl: domainUser.ProfilePictureURL,
			IsActive:          domainUser.IsActive,
			IsBanned:          domainUser.IsBanned,
		},
	}, nil

}

// wip: bikin sisa CRUD buat user
