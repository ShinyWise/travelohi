package handler

import (
	"context"

	"github.com/travelohi/backend/internal/account"
	utils "github.com/travelohi/backend/pkg/utils"
	accountpb "github.com/travelohi/backend/proto/account/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AccountGrpcHandler struct {
	// ikutin gRPC forward-compability
	accountpb.UnimplementedAccountServiceServer
	userUsecase account.AccountUseCase
}

func NewUserGrpcHandler(usecase account.AccountUseCase) *AccountGrpcHandler {
	return &AccountGrpcHandler{
		userUsecase: usecase,
	}
}

func (h *AccountGrpcHandler) InitProfile(ctx context.Context, req *accountpb.InitProfileRequest) (*accountpb.InitProfileResponse, error) {
	newAccount := &account.Account{
		ID:                   req.GetId(),
		Email:                req.GetEmail(),
		FirstName:            req.GetFirstName(),
		LastName:             req.GetLastName(),
		Gender:               req.GetGender(),
		DOB:                  req.GetDob(),
		NewsletterSubscribed: req.GetNewsletterSubscribed(),
	}

	err := h.userUsecase.InitProfile(ctx, newAccount)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to initialize profile: %v", err)
	}

	return &accountpb.InitProfileResponse{
		Success: true,
		Message: "Profile initialized successfully",
	}, nil
}

func (h *AccountGrpcHandler) GetProfile(ctx context.Context, req *accountpb.GetProfileRequest) (*accountpb.GetProfileResponse, error) {
	secureUserID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, err
	}

	domainAccount, err := h.userUsecase.GetProfile(ctx, secureUserID)
	if err != nil {
		return nil, err
	}

	return &accountpb.GetProfileResponse{
		Profile: &accountpb.UserProfile{
			Id:                   domainAccount.ID,
			Email:                domainAccount.Email,
			FirstName:            domainAccount.FirstName,
			LastName:             domainAccount.LastName,
			Gender:               domainAccount.Gender,
			Dob:                  domainAccount.DOB,
			ProfilePictureUrl:    domainAccount.ProfilePictureURL,
			NewsletterSubscribed: domainAccount.NewsletterSubscribed,
			HiWalletBalance:      domainAccount.HiWalletBalance,
			PhoneNumber:          domainAccount.PhoneNumber,
			Address:              domainAccount.Address,
		},
	}, nil
}

func (h *AccountGrpcHandler) UpdateProfile(ctx context.Context, req *accountpb.UpdateProfileRequest) (*accountpb.UpdateProfileResponse, error) {
	secureUserID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, err
	}

	// translate protobuf request jadi domain
	updateData := &account.Account{
		ID:                   secureUserID,
		FirstName:            req.GetFirstName(),
		LastName:             req.GetLastName(),
		ProfilePictureURL:    req.GetProfilePictureUrl(),
		NewsletterSubscribed: req.GetNewsletterSubscribed(),
		PhoneNumber:          req.GetPhoneNumber(),
		Address:              req.GetAddress(),
	}

	updatedAccount, err := h.userUsecase.UpdateProfile(ctx, updateData)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to update profile: %v", err)
	}

	return &accountpb.UpdateProfileResponse{
		Success: true,
		UpdatedProfile: &accountpb.UserProfile{
			Id:                   updatedAccount.ID,
			Email:                updatedAccount.Email,
			FirstName:            updatedAccount.FirstName,
			LastName:             updatedAccount.LastName,
			Gender:               updatedAccount.Gender,
			Dob:                  updatedAccount.DOB,
			ProfilePictureUrl:    updatedAccount.ProfilePictureURL,
			NewsletterSubscribed: updatedAccount.NewsletterSubscribed,
			HiWalletBalance:      updatedAccount.HiWalletBalance,
			PhoneNumber:          updatedAccount.PhoneNumber,
			Address:              updatedAccount.Address,
		},
	}, nil

}
