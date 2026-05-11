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

func (h *UserGrpcHandler) CreateUser(ctx context.Context, req *userpb.CreateUserRequest) (*userpb.UserResponse, error) {
	// 1. input validation
	if req.GetEmail() == "" {
		return nil, errors.New("email is required")
	}
	if req.GetFirstName() == "" || req.GetLastName() == "" {
		return nil, errors.New("first name and last name are required")
	}
	if req.GetGender() == "" {
		return nil, errors.New("gender is required")
	}
	if req.GetDob() == "" {
		return nil, errors.New("date of birth is required")
	}

	// 2. map proto DTO ke entity domain-> biar bisa dikasih ke usecase -> repo
	domainUser := &user.User{
		Email:     req.GetEmail(),
		FirstName: req.GetFirstName(),
		LastName:  req.GetLastName(),
		Gender:    req.GetGender(),
		DOB:       req.GetDob(),
	}

	// 3. panggil usecase
	createdUser, err := h.userUsecase.CreateUser(ctx, domainUser)
	if err != nil {
		return nil, err
	}

	// 4. balikin lagi ke bentuk proto response
		User: &userpb.User{
			Id:                createdUser.ID,
			Email:             createdUser.Email,
			FirstName:         createdUser.FirstName,
			LastName:          createdUser.LastName,
			Gender:            createdUser.Gender,
			Dob:               createdUser.DOB,
			ProfilePictureUrl: createdUser.ProfilePictureURL,
			IsActive:          createdUser.IsActive,
			IsBanned:          createdUser.IsBanned,
		},
	}, nil
}
