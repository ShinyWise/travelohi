package repository

import (
	"context"
	"time"

	"github.com/travelohi/backend/internal/game"
	"gorm.io/gorm"
)

type GameMatchModel struct {
	ID              string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	PlayerOneID     string    `gorm:"column:player_one_id;type:varchar(255);not null"`
	PlayerTwoID     string    `gorm:"column:player_two_id;type:varchar(255);not null"`
	WinnerID        string    `gorm:"column:winner_id;type:varchar(255)"`
	DurationSeconds int       `gorm:"column:duration_seconds;type:int;not null"`
	CreatedAt       time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (GameMatchModel) TableName() string { return "game_matches" }

type postgresGameRepo struct {
	db *gorm.DB
}

func NewPostgresGameRepository(db *gorm.DB) game.Repository {
	return &postgresGameRepo{db: db}
}

func (r *postgresGameRepo) SaveMatchResult(ctx context.Context, result *game.MatchResult) error {
	model := &GameMatchModel{
		ID:              result.ID,
		PlayerOneID:     result.PlayerOneID,
		PlayerTwoID:     result.PlayerTwoID,
		WinnerID:        result.WinnerID,
		DurationSeconds: result.DurationSeconds,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresGameRepo) GetUsernameByID(ctx context.Context, userID string) (string, error) {
	var firstName string
	err := r.db.WithContext(ctx).
		Table("account_models").
		Select("first_name").
		Where("id = ?", userID).
		Row().
		Scan(&firstName)
	if err != nil {
		return "", err
	}
	return firstName, nil
}

func (r *postgresGameRepo) AwardPrize(ctx context.Context, userID string, amount int64) error {
	return r.db.WithContext(ctx).Table("account_models").
		Where("id = ?", userID).
		UpdateColumn("hi_wallet_balance", gorm.Expr("hi_wallet_balance + ?", amount)).Error
}
