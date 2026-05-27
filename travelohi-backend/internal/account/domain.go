package account

import (
	"context"
	"time"
)

type Booking struct {
	ID                   string
	UserID               string
	TransactionID        string
	ItemType             string
	DisplayName          string
	CheckInDate          string
	CheckOutDate         string
	Status               string
	BookingReferenceCode string
	RoomID               string
	HotelID              string
	ImageUrl             string
	CreatedAt            time.Time
}

type Account struct {
	ID                   string
	Email                string
	FirstName            string
	LastName             string
	Gender               string
	DOB                  string
	ProfilePictureURL    string
	IsActive             bool
	NewsletterSubscribed bool
	HiWalletBalance      int64
	PhoneNumber          string
	Address              string
	IsAdmin              bool
}

type AccountRepository interface {
	Create(ctx context.Context, account *Account) error
	GetByID(ctx context.Context, id string) (*Account, error)
	GetByEmail(ctx context.Context, email string) (*Account, error)
	Update(ctx context.Context, account *Account) error
	Delete(ctx context.Context, account *Account) error

	DeductBalance(ctx context.Context, userID string, amount int64) error
	AddBalance(ctx context.Context, userID string, amount int64) error
	GetPromoDiscount(ctx context.Context, promoCode string) (int64, error)
}

type BookingRepository interface {
	CreateBooking(ctx context.Context, booking *Booking) error
	GetBookingHistory(ctx context.Context, userID string, filterStatus string, limit, offset int32) ([]Booking, int64, error)
	GetBookingByID(ctx context.Context, bookingID string) (*Booking, error)
	GetOverlappingBookingsCount(ctx context.Context, roomID string, checkInDate string, checkOutDate string) (int64, error)
	GetRoomInventory(ctx context.Context, roomID string) (int, error)
	CreateRawBooking(ctx context.Context, id, roomID, userID, checkInDate, checkOutDate, status string) error
}

type AccountUseCase interface {
	InitProfile(ctx context.Context, account *Account) error
	GetProfile(ctx context.Context, id string) (*Account, error)
	UpdateProfile(ctx context.Context, account *Account) (*Account, error)

	DeductWallet(ctx context.Context, userID string, amount int64) error
	RefundWallet(ctx context.Context, userID string, amount int64) error

	InternalCreateBooking(ctx context.Context, booking *Booking) (*Booking, error)
	GetBookingHistory(ctx context.Context, userID string, filterStatus string, limit, offset int32) ([]Booking, int32, error)
	GetETicket(ctx context.Context, userID, bookingID string) (*Booking, string, string, string, error)

	RedeemWalletCoupon(ctx context.Context, userID string, couponCode string) error
	GetExchangeRate(ctx context.Context) float64
}
