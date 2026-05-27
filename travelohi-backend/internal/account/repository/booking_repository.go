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
	RoomID               string    `gorm:"column:room_id"`
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
		RoomID:               m.RoomID,
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
		RoomID:               b.RoomID,
		CreatedAt:            b.CreatedAt,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *PostgresBookingRepository) GetOverlappingBookingsCount(ctx context.Context, roomID string, checkInDate string, checkOutDate string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&BookingModel{}).
		Where("room_id = ? AND status != ? AND check_in_date < ? AND check_out_date > ?", roomID, "cancelled", checkOutDate, checkInDate).
		Count(&count).Error
	return count, err
}

func (r *PostgresBookingRepository) GetRoomInventory(ctx context.Context, roomID string) (int, error) {
	var inventory int
	err := r.db.WithContext(ctx).Table("hotel_rooms").
		Where("id = ?", roomID).
		Select("total_inventory").
		Scan(&inventory).Error
	if err != nil {
		return 0, err
	}
	return inventory, nil
}

func (r *PostgresBookingRepository) CreateRawBooking(ctx context.Context, id, roomID, userID, checkInDate, checkOutDate, status string) error {
	return r.db.WithContext(ctx).Exec(
		"INSERT INTO bookings (id, room_id, user_id, check_in_date, check_out_date, status) VALUES (?, ?, ?, ?, ?, ?)",
		id, roomID, userID, checkInDate, checkOutDate, status,
	).Error
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
		b := m.ToDomain()
		if b.ItemType == "hotel_room" && b.RoomID != "" {
			var hotelID string
			_ = r.db.WithContext(ctx).Table("hotel_rooms").
				Where("id = ?", b.RoomID).
				Select("hotel_id").
				Scan(&hotelID).Error
			b.HotelID = hotelID

			var hotelImage string
			_ = r.db.WithContext(ctx).Table("hotels").
				Where("id = ?", hotelID).
				Select("picture_urls->>0").
				Scan(&hotelImage).Error
			b.ImageUrl = hotelImage
		} else if b.ItemType == "flight_seat" && b.RoomID != "" {
			var airlineLogo string
			_ = r.db.WithContext(ctx).Table("airlines").
				Joins("JOIN flights ON flights.airline_id = airlines.id").
				Joins("JOIN flight_seats ON flight_seats.flight_id = flights.id").
				Where("flight_seats.id = ?", b.RoomID).
				Select("airlines.logo_url").
				Scan(&airlineLogo).Error
			b.ImageUrl = airlineLogo
		}
		bookings = append(bookings, b)
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
	if domain.ItemType == "hotel_room" && domain.RoomID != "" {
		var hotelID string
		_ = r.db.WithContext(ctx).Table("hotel_rooms").
			Where("id = ?", domain.RoomID).
			Select("hotel_id").
			Scan(&hotelID).Error
		domain.HotelID = hotelID

		var hotelImage string
		_ = r.db.WithContext(ctx).Table("hotels").
			Where("id = ?", hotelID).
			Select("picture_urls->>0").
			Scan(&hotelImage).Error
		domain.ImageUrl = hotelImage
	} else if domain.ItemType == "flight_seat" && domain.RoomID != "" {
		var airlineLogo string
		_ = r.db.WithContext(ctx).Table("airlines").
			Joins("JOIN flights ON flights.airline_id = airlines.id").
			Joins("JOIN flight_seats ON flight_seats.flight_id = flights.id").
			Where("flight_seats.id = ?", domain.RoomID).
			Select("airlines.logo_url").
			Scan(&airlineLogo).Error
		domain.ImageUrl = airlineLogo
	}
	return &domain, nil
}
