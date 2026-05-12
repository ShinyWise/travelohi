package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/travelohi/backend/internal/auth"
	"github.com/travelohi/backend/pkg/hash"
	"github.com/travelohi/backend/pkg/id"
	"github.com/travelohi/backend/pkg/token"
	accountpb "github.com/travelohi/backend/proto/account/v1"
)

type authUseCase struct {
	repo           auth.AuthRepository
	cache          auth.CacheRepository
	accountService accountpb.AccountServiceClient
	hasher         hash.PasswordHasher
	idGen          id.Generator
	tokenMaker     token.Maker
}

func NewAuthUseCase(
	repo auth.AuthRepository,
	cache auth.CacheRepository,
	accountService accountpb.AccountServiceClient,
	hasher hash.PasswordHasher,
	idGen id.Generator,
	tokenMaker token.Maker,
) auth.AuthUseCase {
	return &authUseCase{
		repo:           repo,
		cache:          cache,
		accountService: accountService,
		hasher:         hasher,
		idGen:          idGen,
		tokenMaker:     tokenMaker,
	}
}

var _ auth.AuthUseCase = (*authUseCase)(nil)

func (uc *authUseCase) Register(ctx context.Context, req *auth.RegisterData) (*auth.AuthResult, error) {
	if req.Password != req.ConfirmPassword {
		return nil, errors.New("Password do not match")
	}

	_, err := uc.repo.GetByEmail(ctx, req.Email)
	if err == nil {
		return nil, errors.New("This email already registered!")
	} else if !errors.Is(err, auth.ErrInvalidCreds) {
		return nil, auth.ErrInternal
	}

	// Hasher here
	hashedPassword, err := uc.hasher.Hash(req.Password)

	if err != nil {
		return nil, auth.ErrHashing
	}

	hashedSecurityAnswer, err := uc.hasher.Hash(req.SecurityAnswer)
	if err != nil {
		return nil, auth.ErrHashing
	}

	// generate id buat account baru
	newUserID := uc.idGen.Generate()

	vaultRecord := &auth.Auth{
		ID:                 newUserID,
		Email:              req.Email,
		PasswordHash:       hashedPassword,
		SecurityQuestionID: req.SecurityQuestionID,
		SecurityAnswerHash: hashedSecurityAnswer,
		IsBanned:           false,
	}
	// masukin ke repo
	if err := uc.repo.Create(ctx, vaultRecord); err != nil {
		return nil, auth.ErrInternal
	}

	// create account, panggil accountServices
	_, err = uc.accountService.InitProfile(ctx, &accountpb.InitProfileRequest{
		Id:                   newUserID,
		Email:                req.Email,
		FirstName:            req.FirstName,
		LastName:             req.LastName,
		Gender:               req.Gender,
		Dob:                  req.DOB,
		NewsletterSubscribed: req.SubscribeNewsletter,
	})

	if err != nil {
		return nil, errors.New("Failed to initialize Profile!")
	}

	return &auth.AuthResult{
		UserID:  newUserID,
		Message: "Registration successful! Please log in.",
	}, nil
}

func (uc *authUseCase) Login(ctx context.Context, email, password string) (*auth.AuthResult, error) {
	user, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if user.IsBanned {
		return nil, errors.New("Your account has been suspended")
	}

	// crypto check
	if err := uc.hasher.Compare(user.PasswordHash, password); err != nil {
		return nil, auth.ErrInvalidCreds
	}

	// validasi session
	sessionID := uc.idGen.Generate()

	sessionKey := "session:" + user.ID

	// expired 24 jam
	if err := uc.cache.Set(ctx, sessionKey, []byte(sessionID), 86400); err != nil {
		return nil, auth.ErrInternal
	}

	// create accesstoken for validating login access.
	accessToken, err := uc.tokenMaker.CreateToken(user.ID, sessionID, 24*time.Hour)
	if err != nil {
		return nil, auth.ErrInternal
	}

	return &auth.AuthResult{
		UserID:      user.ID,
		AccessToken: accessToken,
		Message:     "Login successful!",
	}, nil

}

func (uc *authUseCase) LoginWithOTP(ctx context.Context, email, otp string) (*auth.AuthResult, error) {
	return nil, nil
}

func (uc *authUseCase) SendOTP(ctx context.Context, email string) error {
	return nil
}

func (uc *authUseCase) RegisterUser(ctx context.Context, req *auth.RegisterData) (*auth.AuthResult, error) {
	return nil, nil
}
func (uc *authUseCase) Logout(ctx context.Context, token string) error {
	return nil
}
