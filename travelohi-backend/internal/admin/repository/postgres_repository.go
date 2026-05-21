package repository

import (
	"context"
	"fmt"

	"github.com/travelohi/backend/internal/admin"
	"gorm.io/gorm"
)

type PromoModel struct {
	ID             string `gorm:"primaryKey;type:varchar(255)"`
	PromoCode      string `gorm:"type:varchar(50);uniqueIndex;not null"`
	DiscountAmount int64  `gorm:"type:bigint;not null"`
	IsActive       bool   `gorm:"type:boolean;default:true"`
}

func (PromoModel) TableName() string { return "promos" }

// subset account table buat view admin
type AccountModel struct {
	ID                   string `gorm:"primaryKey;column:id"`
	Email                string `gorm:"column:email"`
	FirstName            string `gorm:"column:first_name"`
	LastName             string `gorm:"column:last_name"`
	IsAdmin              bool   `gorm:"column:is_admin"`
	IsBanned             bool   `gorm:"column:is_banned"`
	NewsletterSubscribed bool   `gorm:"column:newsletter_subscribed"`
}

func (AccountModel) TableName() string { return "account_models" }

type HotelModel struct {
	ID            string   `gorm:"primaryKey;type:varchar(255)"`
	Name          string   `gorm:"type:varchar(255);not null"`
	Description   string   `gorm:"type:text"`
	Address       string   `gorm:"type:text"`
	PictureURLs   []string `gorm:"type:jsonb;serializer:json"`
	Facilities    []string `gorm:"type:jsonb;serializer:json"`
	StartingPrice int64    `gorm:"type:bigint;not null"`
}

func (HotelModel) TableName() string { return "hotels" }

type AirlineModel struct {
	ID      string `gorm:"primaryKey;type:varchar(255)"`
	Name    string `gorm:"type:varchar(255);not null"`
	LogoURL string `gorm:"type:text"`
}

func (AirlineModel) TableName() string { return "airlines" }

type postgresAdminRepo struct {
	db *gorm.DB
}

func NewPostgresInventoryRepository(db *gorm.DB) admin.AdminRepository {
	return &postgresAdminRepo{db: db}
}

func (r *postgresAdminRepo) InsertHotel(ctx context.Context, h *admin.Hotel) error {
	model := &HotelModel{
		ID:            h.ID,
		Name:          h.Name,
		Description:   h.Description,
		Address:       h.Address,
		PictureURLs:   h.PictureURLs,
		Facilities:    h.Facilities,
		StartingPrice: h.StartingPrice,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresAdminRepo) InsertAirline(ctx context.Context, a *admin.Airline) error {
	model := &AirlineModel{
		ID:      a.ID,
		Name:    a.Name,
		LogoURL: a.LogoURL,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresAdminRepo) InsertPromo(ctx context.Context, p *admin.Promo) error {
	model := &PromoModel{
		ID:             p.ID,
		PromoCode:      p.PromoCode,
		DiscountAmount: p.DiscountAmount,
		IsActive:       p.IsActive,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresAdminRepo) UpdatePromoStatus(ctx context.Context, promoID string, isActive bool) error {
	return r.db.WithContext(ctx).
		Model(&PromoModel{}).
		Where("id = ?", promoID).
		Update("is_active", isActive).Error
}

func (r *postgresAdminRepo) GetUsers(ctx context.Context, limit, offset int32) ([]*admin.UserAdminView, int64, error) {
	var models []AccountModel
	var total int64

	// count total records
	err := r.db.WithContext(ctx).Model(&AccountModel{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// fetch paginated results
	err = r.db.WithContext(ctx).
		Limit(int(limit)).
		Offset(int(offset)).
		Find(&models).Error

	if err != nil {
		return nil, 0, err
	}

	// map to domain entities
	var users []*admin.UserAdminView
	for _, m := range models {
		users = append(users, &admin.UserAdminView{
			ID:       m.ID,
			Email:    m.Email,
			FullName: fmt.Sprintf("%s %s", m.FirstName, m.LastName),
			IsAdmin:  m.IsAdmin,
			IsBanned: m.IsBanned,
		})
	}

	return users, total, nil
}

func (r *postgresAdminRepo) UpdateUserBanStatus(ctx context.Context, userID string, isBanned bool) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// update profile table
		if err := tx.Model(&AccountModel{}).Where("id = ?", userID).Update("is_banned", isBanned).Error; err != nil {
			return err
		}
		// update credentials table
		if err := tx.Table("auths").Where("id = ?", userID).Update("is_banned", isBanned).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *postgresAdminRepo) GetNewsletterSubscribers(ctx context.Context) ([]*admin.Subscriber, error) {
	var models []AccountModel

	// query subscribed users who are not banned
	err := r.db.WithContext(ctx).
		Where("newsletter_subscribed = ?", true).
		Where("is_banned = ?", false).
		Find(&models).Error

	if err != nil {
		return nil, err
	}

	var subscribers []*admin.Subscriber
	for _, m := range models {
		subscribers = append(subscribers, &admin.Subscriber{
			ID:    m.ID,
			Email: m.Email,
			Name:  m.FirstName + " " + m.LastName,
		})
	}

	return subscribers, nil
}
