package auth

import (
	"context"
	"errors"
)

// sentinel errors, biar code lebih rapi
var (
	ErrValidation   = errors.New("validation failed")
	ErrHashing      = errors.New("failed to hash secure data")
	ErrInternal     = errors.New("internal server error")
	ErrInvalidCreds = errors.New("invalid email or password")
)

type Auth struct {
	ID                 string
	Email              string
	PasswordHash       string
	SecurityQuestionID int32
	SecurityAnswerHash string
	IsBanned           bool
}

// buat ambil data register dari frontend payload
type RegisterData struct {
	Email               string
	Password            string
	ConfirmPassword     string
	FirstName           string
	LastName            string
	DOB                 string
	Gender              string
	ProfilePictureURL   string
	SecurityQuestionID  int32
	SecurityAnswer      string
	SubscribeNewsletter bool
}

type AuthResult struct {
	UserID      string
	AccessToken string
	Message     string
}

type AuthRepository interface {
	Create(ctx context.Context, auth *Auth) error
	GetByEmail(ctx context.Context, email string) (*Auth, error)
}

// handles temporary storage --> memcached buat otp, blacklist
type CacheRepository interface {
	Set(ctx context.Context, key string, value []byte, expirationSeconds int32) error
	Get(ctx context.Context, key string) ([]byte, error)
	Delete(ctx context.Context, key string) error
}

type AuthUseCase interface {
	RegisterUser(ctx context.Context, req *RegisterData) (*AuthResult, error)
	Login(ctx context.Context, email, password string) (*AuthResult, error)
	SendOTP(ctx context.Context, email string) error
	LoginWithOTP(ctx context.Context, email, otp string) (*AuthResult, error)
	Logout(ctx context.Context, token string) error
}
