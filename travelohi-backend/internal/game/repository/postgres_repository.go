package repository

import (
	"context"
	"time"

	"github.com/travelohi/backend/internal/game"
	"gorm.io/gorm"
)

// gorm model
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
