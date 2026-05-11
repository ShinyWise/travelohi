package user

import "context"

type User struct {
	ID                   string
	Email                string
	FirstName            string
	LastName             string
	Gender               string
	DOB                  string
	ProfilePictureURL    string
	IsActive             bool
	IsBanned             bool
	PasswordHash         string
	SecurityAnswerHash   string
	SecurityQuestionID   string
	NewsletterSubscribed bool
}

// kasih tau method yang harus dimiliki user repo.
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, user *User) error
}

type UserUseCase interface {
	CreateUser(ctx context.Context, user *User) (*User, error)
	GetUser(ctx context.Context, id string) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
	DeleteUser(ctx context.Context, id string) error
}
