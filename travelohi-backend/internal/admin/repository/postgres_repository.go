package repository

import (
	"context"
	"database/sql/driver"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/admin"
	"gorm.io/gorm"
)

type ByteaArray [][]byte

// Value implements driver.Valuer
func (a ByteaArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}
	var sb strings.Builder
	sb.WriteString("{")
	for i, b := range a {
		if i > 0 {
			sb.WriteString(",")
		}
		sb.WriteString(`"\\x` + hex.EncodeToString(b) + `"`)
	}
	sb.WriteString("}")
	return sb.String(), nil
}

// Scan implements sql.Scanner
func (a *ByteaArray) Scan(src interface{}) error {
	if src == nil {
		*a = nil
		return nil
	}

	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("unsupported type %T for ByteaArray", src)
	}

	if len(s) < 2 || s[0] != '{' || s[len(s)-1] != '}' {
		return errors.New("invalid bytea[] array syntax")
	}

	s = s[1 : len(s)-1]
	if len(s) == 0 {
		*a = [][]byte{}
		return nil
	}

	var elements [][]byte
	parts := strings.Split(s, ",")
	for _, part := range parts {
		part = strings.Trim(part, ` "`)
		if strings.HasPrefix(part, `\\x`) {
			b, err := hex.DecodeString(part[3:])
			if err != nil {
				return err
			}
			elements = append(elements, b)
		} else if strings.HasPrefix(part, `\x`) {
			b, err := hex.DecodeString(part[2:])
			if err != nil {
				return err
			}
			elements = append(elements, b)
		} else {
			elements = append(elements, []byte(part))
		}
	}
	*a = elements
	return nil
}

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
	ID            string     `gorm:"primaryKey;type:varchar(255)"`
	Name          string     `gorm:"type:varchar(255);not null"`
	Description   string     `gorm:"type:text"`
	Address       string     `gorm:"type:text"`
	Pictures      ByteaArray `gorm:"column:pictures;type:bytea[]"`
	Facilities    []string   `gorm:"type:jsonb;serializer:json"`
	StartingPrice int64      `gorm:"type:bigint;not null"`
}

func (HotelModel) TableName() string { return "hotels" }

type AirlineModel struct {
	ID       string `gorm:"primaryKey;type:varchar(255)"`
	Name     string `gorm:"type:varchar(255);not null"`
	IATACode string `gorm:"column:iata_code;type:varchar(10)"`
	Logo     []byte `gorm:"column:logo;type:bytea"`
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
		Pictures:      ByteaArray(h.Pictures),
		Facilities:    h.Facilities,
		StartingPrice: h.StartingPrice,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresAdminRepo) InsertAirline(ctx context.Context, a *admin.Airline) error {
	model := &AirlineModel{
		ID:       a.ID,
		Name:     a.Name,
		IATACode: a.IATACode,
		Logo:     a.Logo,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

// AutoGenerateFlights seeds a flight and seats for a new airline.
func (r *postgresAdminRepo) AutoGenerateFlights(ctx context.Context, airlineID string) error {
	flightID := uuid.New().String()
	seat1ID := uuid.New().String()
	seat2ID := uuid.New().String()

	const basePrice int64 = 1500000

	flightSQL := `
		INSERT INTO flights
			(id, airline_id, flight_code, origin_airport, destination_airport,
			 departure_time, arrival_time, duration_minutes, is_transit, starting_price)
		VALUES
			($1, $2, 'GA-123', 'CGK', 'SIN',
			 NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 2 hours', 120, false, $3)
	`
	if err := r.db.WithContext(ctx).Exec(flightSQL, flightID, airlineID, basePrice).Error; err != nil {
		return fmt.Errorf("auto-generate flight: %w", err)
	}

	seatsSQL := `
		INSERT INTO flight_seats (id, flight_id, seat_number, seat_class, is_booked, price)
		VALUES
			($1, $2, '12A', 'Economy', false, $3),
			($4, $2, '01A', 'Business', false, $5)
	`
	if err := r.db.WithContext(ctx).Exec(seatsSQL, seat1ID, flightID, basePrice, seat2ID, basePrice*2).Error; err != nil {
		return fmt.Errorf("auto-generate seats: %w", err)
	}

	return nil
}

// AutoGenerateRooms seeds two standard rooms for a new hotel.
func (r *postgresAdminRepo) AutoGenerateRooms(ctx context.Context, hotelID string, basePrice int64) error {
	room1ID := uuid.New().String()
	room2ID := uuid.New().String()

	roomSQL := `
		INSERT INTO hotel_rooms
			(id, hotel_id, name, price_per_night, capacity, facilities, picture_url, total_inventory)
		VALUES
			($1, $2, 'Standard Room', $3, 2, '["WiFi", "AC"]',          'https://picsum.photos/seed/std/800/600',    5),
			($4, $2, 'Deluxe Suite',  $5, 4, '["WiFi", "AC", "Breakfast"]', 'https://picsum.photos/seed/dlx/800/600', 2)
	`
	if err := r.db.WithContext(ctx).Exec(roomSQL,
		room1ID, hotelID, basePrice,
		room2ID, basePrice+500000,
	).Error; err != nil {
		return fmt.Errorf("auto-generate rooms: %w", err)
	}

	return nil
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

func (r *postgresAdminRepo) GetPromos(ctx context.Context) ([]*admin.Promo, error) {
	var models []PromoModel
	err := r.db.WithContext(ctx).Find(&models).Error
	if err != nil {
		return nil, err
	}

	var promos []*admin.Promo
	for _, m := range models {
		promos = append(promos, &admin.Promo{
			ID:             m.ID,
			PromoCode:      m.PromoCode,
			DiscountAmount: m.DiscountAmount,
			IsActive:       m.IsActive,
		})
	}
	return promos, nil
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
