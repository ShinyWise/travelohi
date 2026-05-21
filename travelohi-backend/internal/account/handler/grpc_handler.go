package handler

import (
	"context"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/account"
	"github.com/travelohi/backend/pkg/utils"
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
	// ambil userid dari context
	userID, err := utils.ExtractUserID(ctx)

	// ambil dari request kalo ga ad di ctx
	if err != nil {
		userID = req.GetUserId()
	}

	if userID == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	acc, err := h.userUsecase.GetProfile(ctx, userID)
	if err != nil {
		return nil, status.Error(codes.NotFound, "account not found")
	}

	return &accountpb.GetProfileResponse{
		Profile: &accountpb.UserProfile{
			Id:                   acc.ID,
			Email:                acc.Email,
			FirstName:            acc.FirstName,
			LastName:             acc.LastName,
			Gender:               acc.Gender,
			Dob:                  acc.DOB,
			ProfilePictureUrl:    acc.ProfilePictureURL,
			NewsletterSubscribed: acc.NewsletterSubscribed,
			HiWalletBalance:      acc.HiWalletBalance,
			PhoneNumber:          acc.PhoneNumber,
			Address:              acc.Address,
		},
	}, nil
}

func (h *AccountGrpcHandler) UpdateProfile(ctx context.Context, req *accountpb.UpdateProfileRequest) (*accountpb.UpdateProfileResponse, error) {
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "unauthorized")
	}

	// translate protobuf request jadi domain
	updateData := &account.Account{
		ID:                   userID,
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

func (h *AccountGrpcHandler) DeductWallet(ctx context.Context, req *accountpb.DeductWalletRequest) (*accountpb.WalletResponse, error) {
	userID := req.UserId
	if userID == "" {
		userID, _ = utils.ExtractUserID(ctx)
	}

	if userID == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	err := h.userUsecase.DeductWallet(ctx, userID, req.Amount)
	if err != nil {
		return nil, status.Error(codes.FailedPrecondition, err.Error())
	}

	return &accountpb.WalletResponse{Success: true, Message: "Payment successful"}, nil
}

func (h *AccountGrpcHandler) RefundWallet(ctx context.Context, req *accountpb.RefundWalletRequest) (*accountpb.WalletResponse, error) {
	userID := req.UserId
	if userID == "" {
		userID, _ = utils.ExtractUserID(ctx)
	}

	if userID == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	err := h.userUsecase.RefundWallet(ctx, userID, req.Amount)
	if err != nil {
		return nil, status.Error(codes.Internal, "Refund failed")
	}

	return &accountpb.WalletResponse{Success: true, Message: "Refund successful"}, nil
}

func (h *AccountGrpcHandler) InternalCreateBooking(ctx context.Context, req *accountpb.InternalCreateBookingRequest) (*accountpb.InternalCreateBookingResponse, error) {
	newBooking := &account.Booking{
		ID:            uuid.New().String(),
		UserID:        req.GetUserId(),
		TransactionID: req.GetTransactionId(),
		ItemType:      req.GetItemType(),
		DisplayName:   req.GetDisplayName(),
		CheckInDate:   req.GetCheckInDate(),
		CheckOutDate:  req.GetCheckOutDate(),
	}

	// create uuid
	if newBooking.ID == "" {
		newBooking.ID = "BOOK-" + req.GetTransactionId()
	}

	created, err := h.userUsecase.InternalCreateBooking(ctx, newBooking)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to create booking: %v", err)
	}

	return &accountpb.InternalCreateBookingResponse{
		Success:              true,
		Message:              "Booking created successfully",
		BookingId:            created.ID,
		BookingReferenceCode: created.BookingReferenceCode,
	}, nil
}

func (h *AccountGrpcHandler) GetBookingHistory(ctx context.Context, req *accountpb.GetBookingHistoryRequest) (*accountpb.GetBookingHistoryResponse, error) {
	userID := req.GetUserId()
	if userID == "" {
		userID, _ = utils.ExtractUserID(ctx)
	}
	if userID == "" {
		return nil, status.Error(codes.Unauthenticated, "unauthorized")
	}

	bookings, total, err := h.userUsecase.GetBookingHistory(ctx, userID, req.GetFilterStatus(), req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to get booking history: %v", err)
	}

	var pbBookings []*accountpb.BookingItem
	for _, b := range bookings {
		pbBookings = append(pbBookings, &accountpb.BookingItem{
			BookingId:            b.ID,
			TransactionId:        b.TransactionID,
			ItemType:             b.ItemType,
			DisplayName:          b.DisplayName,
			CheckInDate:          b.CheckInDate,
			CheckOutDate:         b.CheckOutDate,
			Status:               b.Status,
			BookingReferenceCode: b.BookingReferenceCode,
		})
	}

	return &accountpb.GetBookingHistoryResponse{
		Bookings:     pbBookings,
		TotalResults: total,
	}, nil
}

func (h *AccountGrpcHandler) GetETicket(ctx context.Context, req *accountpb.GetETicketRequest) (*accountpb.GetETicketResponse, error) {
	userID := req.GetUserId()
	if userID == "" {
		userID, _ = utils.ExtractUserID(ctx)
	}
	if userID == "" {
		return nil, status.Error(codes.Unauthenticated, "unauthorized")
	}

	booking, qrCodeData, issueDate, passengerName, err := h.userUsecase.GetETicket(ctx, userID, req.GetBookingId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "Failed to get e-ticket: %v", err)
	}

	pbBooking := &accountpb.BookingItem{
		BookingId:            booking.ID,
		TransactionId:        booking.TransactionID,
		ItemType:             booking.ItemType,
		DisplayName:          booking.DisplayName,
		CheckInDate:          booking.CheckInDate,
		CheckOutDate:         booking.CheckOutDate,
		Status:               booking.Status,
		BookingReferenceCode: booking.BookingReferenceCode,
	}

	return &accountpb.GetETicketResponse{
		BookingDetails:       pbBooking,
		QrCodeData:           qrCodeData,
		IssueDate:            issueDate,
		PassengerOrGuestName: passengerName,
	}, nil
}

func (h *AccountGrpcHandler) RedeemWalletCoupon(ctx context.Context, req *accountpb.RedeemWalletCouponRequest) (*accountpb.WalletResponse, error) {
	userID := req.GetUserId()
	if userID == "" {
		userID, _ = utils.ExtractUserID(ctx)
	}
	if userID == "" {
		return nil, status.Error(codes.Unauthenticated, "unauthorized access")
	}

	if req.GetCouponCode() == "" {
		return nil, status.Error(codes.InvalidArgument, "coupon code is required")
	}

	err := h.userUsecase.RedeemWalletCoupon(ctx, userID, req.GetCouponCode())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	return &accountpb.WalletResponse{
		Success: true,
		Message: "Coupon successfully redeemed and added to your HI-Wallet!",
	}, nil
}

func (h *AccountGrpcHandler) GetExchangeRate(ctx context.Context, req *accountpb.GetExchangeRateRequest) (*accountpb.GetExchangeRateResponse, error) {
	rate := h.userUsecase.GetExchangeRate(ctx)

	return &accountpb.GetExchangeRateResponse{
		UsdToIdrRate: rate,
	}, nil
}
