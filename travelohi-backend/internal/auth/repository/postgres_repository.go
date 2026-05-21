package repository

import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/auth"
	"gorm.io/gorm"
)

type AuthModel struct {
	ID                 string `gorm:"column:id;primary_key"`
	Email              string `gorm:"column:email;unique;not null"`
	PasswordHash       string `gorm:"column:password_hash"`
	SecurityQuestionID int32  `gorm:"column:security_question_id"`
	SecurityAnswerHash string `gorm:"column:security_answer_hash"`
	IsBanned           bool   `gorm:"column:is_banned;default:false"`
}

func (AuthModel) TableName() string {
	return "auths"
}

func (m *AuthModel) ToDomain() *auth.Auth {
	return &auth.Auth{
		ID:                 m.ID,
		Email:              m.Email,
		PasswordHash:       m.PasswordHash,
		SecurityQuestionID: m.SecurityQuestionID,
		SecurityAnswerHash: m.SecurityAnswerHash,
		IsBanned:           m.IsBanned,
	}
}

type PostgresAuthRepository struct {
	db *gorm.DB
}

func NewPostgresAuthRepository(db *gorm.DB) auth.AuthRepository {
	return &PostgresAuthRepository{db: db}
}

// compile-time safety check
var _ auth.AuthRepository = (*PostgresAuthRepository)(nil)

func (r *PostgresAuthRepository) Create(ctx context.Context, a *auth.Auth) error {
	model := &AuthModel{
		ID:                 a.ID,
		Email:              a.Email,
		PasswordHash:       a.PasswordHash,
		SecurityQuestionID: a.SecurityQuestionID,
		SecurityAnswerHash: a.SecurityAnswerHash,
		IsBanned:           a.IsBanned,
	}

	return r.db.WithContext(ctx).Create(model).Error
}

func (r *PostgresAuthRepository) GetByEmail(ctx context.Context, email string) (*auth.Auth, error) {
	var model AuthModel

	err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, auth.ErrInvalidCreds
		}
		return nil, err
	}
	return model.ToDomain(), nil
}

func (r *PostgresAuthRepository) Update(ctx context.Context, a *auth.Auth) error {
	model := &AuthModel{
		ID:                 a.ID,
		Email:              a.Email,
		PasswordHash:       a.PasswordHash,
		SecurityQuestionID: a.SecurityQuestionID,
		SecurityAnswerHash: a.SecurityAnswerHash,
		IsBanned:           a.IsBanned,
	}

	return r.db.WithContext(ctx).Save(model).Error
}

type PostgresRoleRepository struct {
	db *gorm.DB
}

func NewPostgresRoleRepository(db *gorm.DB) *PostgresRoleRepository {
	return &PostgresRoleRepository{db: db}
}

func (r *PostgresRoleRepository) IsAdmin(ctx context.Context, userID string) (bool, error) {
	var isAdmin bool
	err := r.db.WithContext(ctx).
		Table("account_models").
		Select("is_admin").
		Where("id = ?", userID).
		Row().
		Scan(&isAdmin)
	if err != nil {
		return false, err
	}
	return isAdmin, nil
}
