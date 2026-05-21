package admin

import (
	"context"

	adminpb "github.com/travelohi/backend/proto/admin/v1"
)

type Hotel struct {
	ID            string
	Name          string
	Description   string
	Address       string
	PictureURLs   []string
	Facilities    []string
	StartingPrice int64
}

type Airline struct {
	ID      string
	Name    string
	LogoURL string
}

type Promo struct {
	ID             string
	PromoCode      string
	DiscountAmount int64
	IsActive       bool
}

type UserAdminView struct {
	ID       string
	Email    string
	FullName string
	IsAdmin  bool
	IsBanned bool
}

// represents user accept marketing email
type Subscriber struct {
	ID    string
	Email string
	Name  string
}

type AdminRepository interface {
	// inventory ingestion
	InsertHotel(ctx context.Context, hotel *Hotel) error
	InsertAirline(ctx context.Context, airline *Airline) error

	// promo management
	InsertPromo(ctx context.Context, promo *Promo) error
	UpdatePromoStatus(ctx context.Context, promoID string, isActive bool) error

	// user management
	GetUsers(ctx context.Context, limit, offset int32) ([]*UserAdminView, int64, error)
	UpdateUserBanStatus(ctx context.Context, userID string, isBanned bool) error

	GetNewsletterSubscribers(ctx context.Context) ([]*Subscriber, error)
}

type UseCase interface {
	// inventory ingestion
	InsertHotel(ctx context.Context, req *adminpb.InsertHotelRequest) error
	InsertAirline(ctx context.Context, req *adminpb.InsertAirlineRequest) error

	// promo & user management
	CreatePromo(ctx context.Context, req *adminpb.CreatePromoRequest) error
	TogglePromoStatus(ctx context.Context, req *adminpb.TogglePromoRequest) error
	GetAllUsers(ctx context.Context, req *adminpb.GetAllUsersRequest) (*adminpb.GetAllUsersResponse, error)
	BanUser(ctx context.Context, req *adminpb.BanUserRequest) error

	// notifications
	SendBroadcast(ctx context.Context, req *adminpb.SendBroadcastRequest) error
}
