package handler

import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/account"
	accountpb "github.com/travelohi/backend/proto/account/v1"
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

func (h *AccountGrpcHandler) GetProfile(ctx context.Context, req *accountpb.GetProfileRequest) (*accountpb.GetProfileResponse, error) {
	if req.GetUserId() == "" {
		return nil, errors.New("id is required")
	}

	domainAccount, err := h.userUsecase.GetProfile(ctx, req.GetUserId())
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
