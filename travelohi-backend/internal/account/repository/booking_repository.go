package repository

import (
	"context"
	"time"

	"github.com/travelohi/backend/internal/account"
	"gorm.io/gorm"
)

type BookingModel struct {
	ID                   string    `gorm:"primaryKey;column:id"`
	UserID               string    `gorm:"column:user_id;index"`
	TransactionID        string    `gorm:"column:transaction_id"`
	ItemType             string    `gorm:"column:item_type"`
	DisplayName          string    `gorm:"column:display_name"`
	CheckInDate          string    `gorm:"column:check_in_date"`
	CheckOutDate         string    `gorm:"column:check_out_date"`
	Status               string    `gorm:"column:status"`
	BookingReferenceCode string    `gorm:"column:booking_reference_code"`
	CreatedAt            time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (m *BookingModel) ToDomain() account.Booking {
	return account.Booking{
		ID:                   m.ID,
		UserID:               m.UserID,
		TransactionID:        m.TransactionID,
		ItemType:             m.ItemType,
		DisplayName:          m.DisplayName,
		CheckInDate:          m.CheckInDate,
		CheckOutDate:         m.CheckOutDate,
		Status:               m.Status,
		BookingReferenceCode: m.BookingReferenceCode,
		CreatedAt:            m.CreatedAt,
	}
}

type PostgresBookingRepository struct {
	db *gorm.DB
}

func NewPostgresBookingRepository(db *gorm.DB) account.BookingRepository {
	return &PostgresBookingRepository{
		db: db,
	}
}

func (r *PostgresBookingRepository) CreateBooking(ctx context.Context, b *account.Booking) error {
	model := &BookingModel{
		ID:                   b.ID,
		UserID:               b.UserID,
		TransactionID:        b.TransactionID,
		ItemType:             b.ItemType,
		DisplayName:          b.DisplayName,
		CheckInDate:          b.CheckInDate,
		CheckOutDate:         b.CheckOutDate,
		Status:               b.Status,
		BookingReferenceCode: b.BookingReferenceCode,
		CreatedAt:            b.CreatedAt,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *PostgresBookingRepository) GetBookingHistory(ctx context.Context, userID string, filterStatus string, limit, offset int32) ([]account.Booking, int64, error) {
	var models []BookingModel
	var total int64

	query := r.db.WithContext(ctx).Model(&BookingModel{}).Where("user_id = ?", userID)

	switch filterStatus {
	case "ongoing":
		query = query.Where("status = ?", "ongoing")
	case "past":
		query = query.Where("status IN ?", []string{"completed", "cancelled"})
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	if limit > 0 {
		query = query.Limit(int(limit))
	}
	if offset > 0 {
		query = query.Offset(int(offset))
	}

	err = query.Order("created_at desc").Find(&models).Error
	if err != nil {
		return nil, 0, err
	}

	var bookings []account.Booking
	for _, m := range models {
		bookings = append(bookings, m.ToDomain())
	}

	return bookings, total, nil
}

func (r *PostgresBookingRepository) GetBookingByID(ctx context.Context, bookingID string) (*account.Booking, error) {
	var model BookingModel
	err := r.db.WithContext(ctx).Where("id = ?", bookingID).First(&model).Error
	if err != nil {
		return nil, err
	}
	domain := model.ToDomain()
	return &domain, nil
}
