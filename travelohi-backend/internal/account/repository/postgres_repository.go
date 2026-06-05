package repository

import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/account"
	"gorm.io/gorm"
)

type AccountModel struct {
	ID                   string `gorm:"primarykey;column:id"`
	Email                string `gorm:"column:email"`
	FirstName            string `gorm:"column:first_name"`
	LastName             string `gorm:"column:last_name"`
	Gender               string `gorm:"column:gender"`
	DOB                  string `gorm:"column:dob"`
	ProfilePicture       []byte `gorm:"column:profile_picture;type:bytea"`
	IsActive             bool   `gorm:"column:is_active"`
	NewsletterSubscribed bool   `gorm:"column:newsletter_subscribed"`

	HiWalletBalance int64  `gorm:"column:hi_wallet_balance"`
	PhoneNumber     string `gorm:"column:phone_number"`
	Address         string `gorm:"column:address"`
	IsAdmin         bool   `gorm:"column:is_admin"`
}

type BankAccountModel struct {
	ID         string `gorm:"primarykey;column:id"`
	UserID     string `gorm:"column:user_id"`
	BankName   string `gorm:"column:bank_name"`
	CardNumber string `gorm:"column:card_number"`
}

func (m *BankAccountModel) ToDomain() account.BankAccount {
	return account.BankAccount{
		ID:         m.ID,
		UserID:     m.UserID,
		BankName:   m.BankName,
		CardNumber: m.CardNumber,
	}
}

// function buat bantu mapping gorm data into pure domain
func (m *AccountModel) ToDomain() *account.Account {
	return &account.Account{
		ID:                   m.ID,
		Email:                m.Email,
		FirstName:            m.FirstName,
		LastName:             m.LastName,
		IsActive:             m.IsActive,
		Gender:               m.Gender,
		DOB:                  m.DOB,
		ProfilePicture:       m.ProfilePicture,
		NewsletterSubscribed: m.NewsletterSubscribed,
		HiWalletBalance:      m.HiWalletBalance,
		PhoneNumber:          m.PhoneNumber,
		Address:              m.Address,
		IsAdmin:              m.IsAdmin,
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
		ProfilePicture:       acc.ProfilePicture,
		IsActive:             acc.IsActive,
		HiWalletBalance:      acc.HiWalletBalance,
		NewsletterSubscribed: acc.NewsletterSubscribed,
		IsAdmin:              acc.IsAdmin,
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
		ProfilePicture:       u.ProfilePicture,
		Email:                u.Email,
		DOB:                  u.DOB,
		Gender:               u.Gender,
		NewsletterSubscribed: u.NewsletterSubscribed,
		PhoneNumber:          u.PhoneNumber,
		Address:              u.Address,
	}

	err := r.db.WithContext(ctx).Where("id = ?", u.ID).Updates(model).Error
	if err != nil {
		return err
	}

	// sync email ke tabel auths biar bisa login pake email baru
	if u.Email != "" {
		return r.db.WithContext(ctx).Table("auths").Where("id = ?", u.ID).Update("email", u.Email).Error
	}

	return nil
}

func (r *PostgresAccountRepository) Delete(ctx context.Context, u *account.Account) error {
	return r.db.WithContext(ctx).Where("id = ?", u.ID).Delete(&AccountModel{}).Error

}

func (r *PostgresAccountRepository) DeductBalance(ctx context.Context, userID string, amount int64) error {
	// update pake postgres
	result := r.db.WithContext(ctx).Exec(`
		UPDATE account_models 
		SET hi_wallet_balance = hi_wallet_balance - ? 
		WHERE id = ? AND hi_wallet_balance >= ?
	`, amount, userID, amount)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("insufficient hi_wallet balance")
	}

	return nil
}

func (r *PostgresAccountRepository) AddBalance(ctx context.Context, userID string, amount int64) error {
	result := r.db.WithContext(ctx).Exec(`
		UPDATE account_models 
		SET hi_wallet_balance = hi_wallet_balance + ? 
		WHERE id = ?
	`, amount, userID)

	return result.Error
}

func (r *PostgresAccountRepository) GetPromoDiscount(ctx context.Context, promoCode string) (int64, error) {
	var discount int64

	err := r.db.WithContext(ctx).Table("promos").
		Select("discount_amount").
		Where("promo_code = ? AND is_active = ?", promoCode, true).
		Scan(&discount).Error

	if err != nil || discount == 0 {
		return 0, errors.New("invalid or inactive promo code")
	}

	return discount, nil
}

func (r *PostgresAccountRepository) HasUserUsedCoupon(ctx context.Context, userID, promoCode string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Table("user_promo_usages").
		Where("user_id = ? AND promo_code = ?", userID, promoCode).
		Count(&count).Error
	return count > 0, err
}

func (r *PostgresAccountRepository) RecordCouponUsage(ctx context.Context, userID, promoCode string) error {
	return r.db.WithContext(ctx).Table("user_promo_usages").Create(map[string]interface{}{
		"user_id":    userID,
		"promo_code": promoCode,
	}).Error
}

func (r *PostgresAccountRepository) AddBankAccount(ctx context.Context, bankAcc *account.BankAccount) error {
	model := &BankAccountModel{
		ID:         bankAcc.ID,
		UserID:     bankAcc.UserID,
		BankName:   bankAcc.BankName,
		CardNumber: bankAcc.CardNumber,
	}
	return r.db.WithContext(ctx).Table("bank_accounts").Create(model).Error
}

func (r *PostgresAccountRepository) GetBankAccounts(ctx context.Context, userID string) ([]account.BankAccount, error) {
	var models []BankAccountModel
	err := r.db.WithContext(ctx).Table("bank_accounts").Where("user_id = ?", userID).Find(&models).Error
	if err != nil {
		return nil, err
	}

	var accounts []account.BankAccount
	for _, m := range models {
		accounts = append(accounts, m.ToDomain())
	}
	return accounts, nil
}

func (r *PostgresAccountRepository) DeleteBankAccount(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Table("bank_accounts").Where("id = ?", id).Delete(&BankAccountModel{}).Error
}
