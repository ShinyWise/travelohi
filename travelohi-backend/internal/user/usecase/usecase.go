package user

import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/user"
)

type userUseCase struct {
	repo user.UserRepository
}

func NewUserUseCase(repo user.UserRepository) user.UserUseCase {
	return &userUseCase{
		repo: repo,
	}
}

func (u *userUseCase) CreateUser(ctx context.Context, newUser *user.User) (*user.User, error) {
	// business logic
	// nanti pindah ke auth
	existingUser, err := u.repo.GetByEmail(ctx, newUser.Email)
	if err == nil && existingUser != nil {
		return nil, errors.New("email already registered")
	}
	// default value pas regis
	newUser.IsActive = true
	newUser.IsBanned = false

	if err := u.repo.Create(ctx, newUser); err != nil {
		return nil, err
	}

	return newUser, nil
}

func (uc *userUseCase) GetUser(ctx context.Context, id string) (*user.User, error) {
	if id == "" {
		return nil, errors.New("user ID cannot be empty")
	}

	return uc.repo.GetByID(ctx, id)
}

func (uc *userUseCase) UpdateUser(ctx context.Context, u *user.User) error {
	if u.ID == "" {
		return errors.New("user ID is required to update a profile")
	}

	return uc.repo.Update(ctx, u)
}

func (uc *userUseCase) DeleteUser(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("user ID is required for deletion")
	}

	userToDelete := &user.User{ID: id}

	return uc.repo.Delete(ctx, userToDelete)
}
