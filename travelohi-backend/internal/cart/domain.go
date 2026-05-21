// internal/cart/domain.go
package cart

import (
	"context"
	"time"
)

type CartItem struct {
	ID            string
	UserID        string
	ItemType      string
	ReferenceID   string
	Price         int64
	Status        string
	CreatedAt     time.Time
	LuggageWeight int32
}

type Promo struct {
	ID             string
	PromoCode      string
	DiscountAmount int64
	MaxUses        int32
	CurrentUses    int32
	ExpiryDate     time.Time
}

type CartRepository interface {
	AddToCart(ctx context.Context, item CartItem) error
	GetActiveCartItems(ctx context.Context, userID string) ([]CartItem, error)
	UpdateCartItem(ctx context.Context, itemID, userID string, newCheckIn, newCheckOut string) error
	RemoveFromCart(ctx context.Context, itemID, userID string) error
	MarkCartAsPaid(ctx context.Context, userID string) error

	// promos
	CreatePromo(ctx context.Context, promo Promo) error
	GetPromoByCode(ctx context.Context, code string) (*Promo, error)
	IncrementPromoUsage(ctx context.Context, code string) error
}

type CartUseCase interface {
	AddToCart(ctx context.Context, userID, itemType, referenceID, checkIn, checkOut string, quantity int32, luggageWeight int32) error
	ViewCart(ctx context.Context, userID string) ([]CartItem, int64, int64, int64, string, error) // items, subtotal, discount, total, applied_promo
	UpdateCartItem(ctx context.Context, userID, itemID, newCheckIn, newCheckOut string) error
	RemoveFromCart(ctx context.Context, userID, itemID string) error
	ApplyPromo(ctx context.Context, userID, promoCode string) error

	Checkout(ctx context.Context, userID, paymentMethod, creditCardID, appliedPromoCode string) (string, error)

	InternalCreatePromo(ctx context.Context, promoCode string, discountAmount int64, maxUses int32, expiryDate string) error
}
