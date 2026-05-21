// internal/cart/repository/cart_repository.go
package repository

import (
	"context"
	"time"

	"github.com/travelohi/backend/internal/cart"
	"gorm.io/gorm"
)

type CartItemModel struct {
	ID            string    `gorm:"primaryKey;type:varchar(255)"`
	UserID        string    `gorm:"type:varchar(255);not null;index"`
	ItemType      string    `gorm:"type:varchar(50);not null"`
	ReferenceID   string    `gorm:"type:varchar(255);not null"`
	Price         int64     `gorm:"type:bigint;not null"`
	Status        string    `gorm:"type:varchar(50);default:'in_cart'"`
	LuggageWeight int32     `gorm:"column:luggage_weight;type:int;default:0"`
	CreatedAt     time.Time `gorm:"autoCreateTime"`
}

func (CartItemModel) TableName() string {
	return "cart_items"
}

type PromoModel struct {
	ID             string    `gorm:"primaryKey;type:varchar(255)"`
	PromoCode      string    `gorm:"type:varchar(50);uniqueIndex;not null"`
	DiscountAmount int64     `gorm:"type:bigint;not null"`
	MaxUses        int32     `gorm:"type:int;not null"`
	CurrentUses    int32     `gorm:"type:int;default:0"`
	ExpiryDate     time.Time `gorm:"type:timestamp"`
}

func (PromoModel) TableName() string {
	return "promos"
}

type postgresCartRepo struct {
	db *gorm.DB
}

func NewPostgresCartRepository(db *gorm.DB) cart.CartRepository {
	return &postgresCartRepo{db: db}
}

func (r *postgresCartRepo) AddToCart(ctx context.Context, item cart.CartItem) error {
	dbModel := CartItemModel{
		ID:            item.ID,
		UserID:        item.UserID,
		ItemType:      item.ItemType,
		ReferenceID:   item.ReferenceID,
		Price:         item.Price,
		Status:        item.Status,
		LuggageWeight: item.LuggageWeight,
		CreatedAt:     item.CreatedAt,
	}

	return r.db.WithContext(ctx).Create(&dbModel).Error
}

func (r *postgresCartRepo) GetActiveCartItems(ctx context.Context, userID string) ([]cart.CartItem, error) {
	var models []CartItemModel
	err := r.db.WithContext(ctx).Where("user_id = ? AND status = 'in_cart'", userID).Find(&models).Error
	if err != nil {
		return nil, err
	}

	var items []cart.CartItem
	for _, m := range models {
		items = append(items, cart.CartItem{
			ID:            m.ID,
			UserID:        m.UserID,
			ItemType:      m.ItemType,
			ReferenceID:   m.ReferenceID,
			Price:         m.Price,
			Status:        m.Status,
			LuggageWeight: m.LuggageWeight,
			CreatedAt:     m.CreatedAt,
		})
	}
	return items, nil
}

func (r *postgresCartRepo) MarkCartAsPaid(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&CartItemModel{}).
		Where("user_id = ? AND status = 'in_cart'", userID).
		Update("status", "paid").Error
}

func (r *postgresCartRepo) UpdateCartItem(ctx context.Context, itemID, userID string, newCheckIn, newCheckOut string) error {
	// not supported by current schema
	return nil
}

func (r *postgresCartRepo) RemoveFromCart(ctx context.Context, itemID, userID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", itemID, userID).Delete(&CartItemModel{}).Error
}

func (r *postgresCartRepo) CreatePromo(ctx context.Context, promo cart.Promo) error {
	dbModel := PromoModel{
		ID:             promo.ID,
		PromoCode:      promo.PromoCode,
		DiscountAmount: promo.DiscountAmount,
		MaxUses:        promo.MaxUses,
		CurrentUses:    promo.CurrentUses,
		ExpiryDate:     promo.ExpiryDate,
	}
	return r.db.WithContext(ctx).Create(&dbModel).Error
}

func (r *postgresCartRepo) GetPromoByCode(ctx context.Context, code string) (*cart.Promo, error) {
	var model PromoModel
	err := r.db.WithContext(ctx).Where("promo_code = ?", code).First(&model).Error
	if err != nil {
		return nil, err
	}
	return &cart.Promo{
		ID:             model.ID,
		PromoCode:      model.PromoCode,
		DiscountAmount: model.DiscountAmount,
		MaxUses:        model.MaxUses,
		CurrentUses:    model.CurrentUses,
		ExpiryDate:     model.ExpiryDate,
	}, nil
}

func (r *postgresCartRepo) IncrementPromoUsage(ctx context.Context, code string) error {
	return r.db.WithContext(ctx).Model(&PromoModel{}).Where("promo_code = ?", code).Update("current_uses", gorm.Expr("current_uses + ?", 1)).Error
}
