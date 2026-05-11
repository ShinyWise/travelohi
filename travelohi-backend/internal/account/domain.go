package account

import (
	"context"
)

type Account struct {
	ID                   string
	Email                string
	FirstName            string
	LastName             string
	Gender               string
	DOB                  string
	ProfilePictureURL    string
	IsActive             bool
	IsBanned             bool
	NewsletterSubscribed bool
	HiWalletBalance      int64
	PhoneNumber          string
	Address              string
}

type AccountRepository interface {
	Create(ctx context.Context, account *Account) error
	GetByID(ctx context.Context, id string) (*Account, error)
	GetByEmail(ctx context.Context, email string) (*Account, error)
	Update(ctx context.Context, account *Account) error
	Delete(ctx context.Context, account *Account) error
}

type AccountUseCase interface {
	InitProfile(ctx context.Context, account *Account) error
	GetProfile(ctx context.Context, id string) (*Account, error)
	UpdateProfile(ctx context.Context, account *Account) (*Account, error)

	// add interface related method for hotel and flight later
	// get booking history
	// GetBookingHistory(ctx context.Context, id string) (*Account, error)

	// get e-ticket
	// GetETicket(ctx context.Context, id string) (*Account, error)
}
