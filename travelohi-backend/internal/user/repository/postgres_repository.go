package repository

import (
	"context"

	"github.com/travelohi/backend/internal/user"
	"gorm.io/gorm"
)

// Gorm Model
type UserModel struct {
	ID                   string  `gorm:"primarykey";column:id"`
	Email                string  `gorm:"column:email"`
	FirstName            string  `gorm:"column:first_name"`
	LastName             string  `gorm:"column:last_name"`
	Gender               string  `gorm:"column:gender"`
	DOB                  string  `gorm:"column:dob"`
	ProfilePictureURL    *string `gorm:"column:profile_picture_url"`
	IsActive             bool    `gorm:"column:is_active"`
	IsBanned             bool    `gorm:"column:is_banned"`
	PasswordHash         string  `gorm:"column:password_hash"`
	SecurityAnswerHash   string  `gorm:"column:security_answer_hash"`
	SecurityQuestionID   string  `gorm:"column:security_question_id"`
	NewsletterSubscribed bool    `gorm:"column:newsletter_subscribed"`
}

// function buat bantu  mapping gorm data into pure domain
func (m *UserModel) ToDomain() *user.User {
	var picURL string
	if m.ProfilePictureURL != nil {
		picURL = *m.ProfilePictureURL
	}

	return &user.User{
		ID:                   m.ID,
		Email:                m.Email,
		FirstName:            m.FirstName,
		LastName:             m.LastName,
		IsActive:             m.IsActive,
		IsBanned:             m.IsBanned,
		Gender:               m.Gender,
		DOB:                  m.DOB,
		ProfilePictureURL:    picURL,
		PasswordHash:         m.PasswordHash,
		SecurityAnswerHash:   m.SecurityAnswerHash,
		SecurityQuestionID:   m.SecurityQuestionID,
		NewsletterSubscribed: m.NewsletterSubscribed,
	}
}

type PostgresUserRepository struct {
	db *gorm.DB
}

// NewPostgresUserRepository creates a new instance of the postgres repository
func NewPostgresUserRepository(db *gorm.DB) user.UserRepository {
	return &PostgresUserRepository{
		db: db,
	}
}

// biar interfacenya di run pas compile time
var _ user.UserRepository = (*PostgresUserRepository)(nil)

func (r *PostgresUserRepository) Create(ctx context.Context, u *user.User) error {
	// mapping domain ke model gorm
	model := &UserModel{
		ID:                   u.ID,
		Email:                u.Email,
		FirstName:            u.FirstName,
		LastName:             u.LastName,
		Gender:               u.Gender,
		DOB:                  u.DOB,
		ProfilePictureURL:    &u.ProfilePictureURL, // pake pointer -> buat handle null
		IsActive:             u.IsActive,
		IsBanned:             u.IsBanned,
		PasswordHash:         u.PasswordHash,
		SecurityAnswerHash:   u.SecurityAnswerHash,
		SecurityQuestionID:   u.SecurityQuestionID,
		NewsletterSubscribed: u.NewsletterSubscribed,
	}

	return r.db.WithContext(ctx).Create(model).Error
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
	var model UserModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error; err != nil {
		return nil, err
	}
	return model.ToDomain(), nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	var model UserModel
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error; err != nil {
		return nil, err
	}
	return model.ToDomain(), nil
}

func (r *PostgresUserRepository) Update(ctx context.Context, u *user.User) error {
	// masukin aja field yang bisa diupdate ke GORM model
	model := &UserModel{
		FirstName:            u.FirstName,
		LastName:             u.LastName,
		ProfilePictureURL:    &u.ProfilePictureURL,
		Email:                u.Email,
		NewsletterSubscribed: u.NewsletterSubscribed,
		// TODO: Tambahin phone number and address
	}
	return r.db.WithContext(ctx).Where("id = ?", u.ID).Updates(model).Error
}

func (r *PostgresUserRepository) Delete(ctx context.Context, u *user.User) error {
	return r.db.WithContext(ctx).Where("id = ?", u.ID).Delete(&UserModel{}).Error

}
