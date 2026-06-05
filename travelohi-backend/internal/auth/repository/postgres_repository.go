package repository

import (
	"context"

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
	var result struct {
		ID                 string
		Email              string
		PasswordHash       string
		SecurityQuestionID int32
		SecurityAnswerHash string
		IsBanned           bool
		IsActive           bool
	}

	err := r.db.WithContext(ctx).
		Table("auths").
		Select("auths.id, auths.email, auths.password_hash, auths.security_question_id, auths.security_answer_hash, auths.is_banned, account_models.is_active").
		Joins("left join account_models on account_models.id = auths.id").
		Where("auths.email = ?", email).
		Scan(&result).Error

	if err != nil {
		return nil, err
	}

	if result.ID == "" {
		return nil, auth.ErrInvalidCreds
	}

	return &auth.Auth{
		ID:                 result.ID,
		Email:              result.Email,
		PasswordHash:       result.PasswordHash,
		SecurityQuestionID: result.SecurityQuestionID,
		SecurityAnswerHash: result.SecurityAnswerHash,
		IsBanned:           result.IsBanned,
		IsActive:           result.IsActive,
	}, nil
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
	err := r.db.WithContext(ctx).Save(model).Error
	if err != nil {
		return err
	}

	return r.db.WithContext(ctx).Table("account_models").Where("id = ?", a.ID).Update("is_active", a.IsActive).Error
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
