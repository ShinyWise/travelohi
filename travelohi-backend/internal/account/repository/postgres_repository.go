package repository

import (
	"context"

	"github.com/travelohi/backend/internal/account"
	"gorm.io/gorm"
)

// Gorm Model
type AccountModel struct {
	ID                   string  `gorm:"primarykey;column:id"`
	Email                string  `gorm:"column:email"`
	FirstName            string  `gorm:"column:first_name"`
	LastName             string  `gorm:"column:last_name"`
	Gender               string  `gorm:"column:gender"`
	DOB                  string  `gorm:"column:dob"`
	ProfilePictureURL    *string `gorm:"column:profile_picture_url"`
	IsActive             bool    `gorm:"column:is_active"`
	NewsletterSubscribed bool    `gorm:"column:newsletter_subscribed"`

	HiWalletBalance int64  `gorm:"column:hi_wallet_balance"`
	PhoneNumber     string `gorm:"column:phone_number"`
	Address         string `gorm:"column:address"`
}

// function buat bantu  mapping gorm data into pure domain
func (m *AccountModel) ToDomain() *account.Account {
	var picURL string
	if m.ProfilePictureURL != nil {
		picURL = *m.ProfilePictureURL
	}

	return &account.Account{
		ID:                   m.ID,
		Email:                m.Email,
		FirstName:            m.FirstName,
		LastName:             m.LastName,
		IsActive:             m.IsActive,
		Gender:               m.Gender,
		DOB:                  m.DOB,
		ProfilePictureURL:    picURL,
		NewsletterSubscribed: m.NewsletterSubscribed,
		HiWalletBalance:      m.HiWalletBalance,
		PhoneNumber:          m.PhoneNumber,
		Address:              m.Address,
	}
}

type PostgresAccountRepository struct {
	db *gorm.DB
}

// bikin new instance
func NewPostgresAccountRepository(db *gorm.DB) account.AccountRepository {
	return &PostgresAccountRepository{
		db: db,
	}
}

// biar interfacenya di run pas compile time
var _ account.AccountRepository = (*PostgresAccountRepository)(nil)

func (r *PostgresAccountRepository) Create(ctx context.Context, acc *account.Account) error {
	// mapping domain ke model gorm
	model := &AccountModel{
		ID:                   acc.ID,
		Email:                acc.Email,
		FirstName:            acc.FirstName,
		LastName:             acc.LastName,
		Gender:               acc.Gender,
		DOB:                  acc.DOB,
		NewsletterSubscribed: acc.NewsletterSubscribed,
	}

	return r.db.WithContext(ctx).Create(model).Error
}

func (r *PostgresAccountRepository) GetByID(ctx context.Context, id string) (*account.Account, error) {
	var model AccountModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		return nil, err
	}
	return model.ToDomain(), nil
}

func (r *PostgresAccountRepository) GetByEmail(ctx context.Context, email string) (*account.Account, error) {
	var model AccountModel
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error; err != nil {
		return nil, err
	}
	return model.ToDomain(), nil
}

func (r *PostgresAccountRepository) Update(ctx context.Context, u *account.Account) error {
	// masukin aja field yang bisa diupdate ke GORM model
	model := &AccountModel{
		FirstName:            u.FirstName,
		LastName:             u.LastName,
		ProfilePictureURL:    &u.ProfilePictureURL,
		Email:                u.Email,
		DOB:                  u.DOB,
		Gender:               u.Gender,
		NewsletterSubscribed: u.NewsletterSubscribed,
		PhoneNumber:          u.PhoneNumber,
		Address:              u.Address,
	}

	return r.db.WithContext(ctx).Where("id = ?", u.ID).Updates(model).Error
}

func (r *PostgresAccountRepository) Delete(ctx context.Context, u *account.Account) error {
	return r.db.WithContext(ctx).Where("id = ?", u.ID).Delete(&AccountModel{}).Error

}
