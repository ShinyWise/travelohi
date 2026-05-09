package user

import "context"

type User struct {
	ID                string
	Email             string
	PasswordHash      string
	FirstName         string
	LastName          string
	ProfilePictureURL string
	IsActive          bool
	IsBanned          bool
}

// kasih tau method yang dimiliki user repo.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
}

type UserUserCase interface {
	Register(ctx context.Context, email, password, firstName, lastName string) (*User, error)
	// nanti tambah login,otp,dll
}
