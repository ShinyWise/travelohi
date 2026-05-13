package handler

import (
	"context"

	"github.com/travelohi/backend/internal/auth"
	"github.com/travelohi/backend/pkg/token"
	authpb "github.com/travelohi/backend/proto/auth/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type authHandler struct {
	// for forward compatibility
	authpb.UnimplementedAuthServiceServer
	usecase auth.AuthUseCase
}

func NewAuthHandler(usecase auth.AuthUseCase) authpb.AuthServiceServer {
	return &authHandler{
		usecase: usecase,
	}
}

func (h *authHandler) Register(ctx context.Context, req *authpb.RegisterRequest) (*authpb.AuthResponse, error) {
	// 1. ambil data dari gRPC box
	data := &auth.RegisterData{
		FirstName:           req.GetFirstName(),
		LastName:            req.GetLastName(),
		Email:               req.GetEmail(),
		Password:            req.GetPassword(),
		ConfirmPassword:     req.GetConfirmPassword(),
		Gender:              req.GetGender(),
		DOB:                 req.GetDob(),
		SecurityQuestionID:  req.GetSecurityQuestionId(),
		SecurityAnswer:      req.GetSecurityAnswer(),
		SubscribeNewsletter: req.GetSubscribeNewsletter(),
	}

	// 2. kasih ke auth usecase
	res, err := h.usecase.RegisterUser(ctx, data)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	// 3. result dibalikin lagi ke gRPC box
	return &authpb.AuthResponse{
		UserId:  res.UserID,
		Message: res.Message,
	}, nil
}

func (h *authHandler) Login(ctx context.Context, req *authpb.LoginRequest) (*authpb.AuthResponse, error) {
	res, err := h.usecase.Login(ctx, req.GetEmail(), req.GetPassword())
	if err != nil {
		if err == auth.ErrInvalidCreds {
			return nil, status.Error(codes.Unauthenticated, "invalid email or password")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &authpb.AuthResponse{
		UserId:      res.UserID,
		AccessToken: res.AccessToken,
		Message:     res.Message,
	}, nil
}

func (h *authHandler) LoginWithOTP(ctx context.Context, req *authpb.LoginWithOTPRequest) (*authpb.AuthResponse, error) {
	res, err := h.usecase.LoginWithOTP(ctx, req.GetEmail(), req.GetOtpCode())
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}
	return &authpb.AuthResponse{
		UserId:      res.UserID,
		AccessToken: res.AccessToken,
		Message:     res.Message,
	}, nil
}

func (h *authHandler) SendOTP(ctx context.Context, req *authpb.SendOTPRequest) (*authpb.SendOTPResponse, error) {
	err := h.usecase.SendOTP(ctx, req.GetEmail())
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to process OTP request")
	}

	return &authpb.SendOTPResponse{
		Message: "If that email is registered, an OTP has been sent.",
	}, nil
}

func (h *authHandler) Logout(ctx context.Context, req *authpb.LogoutRequest) (*authpb.LogoutResponse, error) {
	tokenString, err := token.ExtractTokenFromContext(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "authorization token is not provided")
	}

	// kasih token ke logout auth usecase
	err = h.usecase.Logout(ctx, tokenString)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to process logout")
	}

	return &authpb.LogoutResponse{
		Success: true,
		Message: "Successfully logged out",
	}, nil
}
