package usecase

// usecase -> buat business logic and database handoff
import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/account"
)

type AccountUseCase struct {
	repo account.AccountRepository
}

func NewAccountUseCase(repo account.AccountRepository) account.AccountUseCase {
	return &AccountUseCase{
		repo: repo,
	}
}

// diganti dari create jadi init karena udh dibikin di authService, we use microservice handshake
func (uc *AccountUseCase) InitProfile(ctx context.Context, account *account.Account) error {
	if account.ID == "" || account.Email == "" {
		return errors.New("[ERROR] Cannot initialize profile: ID and Email are required")
	}
	return uc.repo.Create(ctx, account)
}

func (uc *AccountUseCase) GetProfile(ctx context.Context, id string) (*account.Account, error) {
	// ambil raw data dari repo dlu sesuai id yang dicari
	acc, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("Account not found")
	}
	return acc, nil
}

func (uc *AccountUseCase) UpdateProfile(ctx context.Context, u *account.Account) (*account.Account, error) {
	if u.ID == "" {
		return nil, errors.New("[ERROR] Cannot update profile: User ID is required")
	}

	err := uc.repo.Update(ctx, u)
	if err != nil {
		return nil, err
	}

	return uc.repo.GetByID(ctx, u.ID)
}
