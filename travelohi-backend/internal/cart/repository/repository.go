package repository

import (
	"context"
	"encoding/json"
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
	Quantity      int32     `gorm:"column:quantity;type:int;default:1"`
	CheckInDate   string    `gorm:"column:check_in_date;type:varchar(50)"`
	CheckOutDate  string    `gorm:"column:check_out_date;type:varchar(50)"`
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

func getFirstImageUrl(jsonStr string) string {
	if jsonStr == "" {
		return ""
	}
	var urls []string
	if err := json.Unmarshal([]byte(jsonStr), &urls); err == nil && len(urls) > 0 {
		return urls[0]
	}
	return ""
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
		Quantity:      item.Quantity,
		CheckInDate:   item.CheckInDate,
		CheckOutDate:  item.CheckOutDate,
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
		displayName := "Item " + m.ReferenceID
		displayImageUrl := ""
		checkInDate := m.CheckInDate
		checkOutDate := m.CheckOutDate

		if m.ItemType == "hotel_room" {
			var details struct {
				RoomName   string `gorm:"column:room_name"`
				HotelName  string `gorm:"column:hotel_name"`
				PictureUrl string `gorm:"column:picture_url"`
			}
			err := r.db.Raw(`
				SELECT hr.name as room_name, h.name as hotel_name, coalesce('data:image/jpeg;base64,' || encode(h.pictures[1], 'base64'), '') as picture_url
				FROM hotel_rooms hr
				JOIN hotels h ON hr.hotel_id = h.id
				WHERE hr.id = ?
			`, m.ReferenceID).Scan(&details).Error
			if err == nil {
				displayName = details.HotelName + " - " + details.RoomName
				displayImageUrl = details.PictureUrl
			}
		} else if m.ItemType == "flight_seat" {
			var details struct {
				SeatNumber    string    `gorm:"column:seat_number"`
				FlightCode    string    `gorm:"column:flight_code"`
				AirlineName   string    `gorm:"column:airline_name"`
				LogoUrl       string    `gorm:"column:logo_url"`
				DepartureTime time.Time `gorm:"column:departure_time"`
				ArrivalTime   time.Time `gorm:"column:arrival_time"`
			}
			err := r.db.Raw(`
				SELECT fs.seat_number, f.flight_code, a.name as airline_name, coalesce('data:image/jpeg;base64,' || encode(a.logo, 'base64'), '') as logo_url, f.departure_time, f.arrival_time
				FROM flight_seats fs
				JOIN flights f ON fs.flight_id = f.id
				LEFT JOIN airlines a ON f.airline_id = a.id
				WHERE fs.id = ?
			`, m.ReferenceID).Scan(&details).Error
			if err == nil {
				displayName = details.AirlineName + " (" + details.FlightCode + ") - Seat " + details.SeatNumber
				displayImageUrl = details.LogoUrl
				checkInDate = details.DepartureTime.Format("2006-01-02 15:04")
				checkOutDate = details.ArrivalTime.Format("2006-01-02 15:04")
			}
		}

		items = append(items, cart.CartItem{
			ID:              m.ID,
			UserID:          m.UserID,
			ItemType:        m.ItemType,
			ReferenceID:     m.ReferenceID,
			Price:           m.Price,
			Status:          m.Status,
			LuggageWeight:   m.LuggageWeight,
			Quantity:        m.Quantity,
			CheckInDate:     checkInDate,
			CheckOutDate:    checkOutDate,
			DisplayName:     displayName,
			DisplayImageUrl: displayImageUrl,
			CreatedAt:       m.CreatedAt,
		})
	}
	return items, nil
}

func (r *postgresCartRepo) GetCartItemByID(ctx context.Context, itemID, userID string) (cart.CartItem, error) {
	var m CartItemModel
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", itemID, userID).First(&m).Error
	if err != nil {
		return cart.CartItem{}, err
	}
	return cart.CartItem{
		ID:            m.ID,
		UserID:        m.UserID,
		ItemType:      m.ItemType,
		ReferenceID:   m.ReferenceID,
		Price:         m.Price,
		Status:        m.Status,
		LuggageWeight: m.LuggageWeight,
		Quantity:      m.Quantity,
		CheckInDate:   m.CheckInDate,
		CheckOutDate:  m.CheckOutDate,
		CreatedAt:     m.CreatedAt,
	}, nil
}

func (r *postgresCartRepo) CheckItemInCart(ctx context.Context, userID, referenceID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&CartItemModel{}).
		Where("user_id = ? AND reference_id = ? AND status = ?", userID, referenceID, "in_cart").
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *postgresCartRepo) GetRoomPrice(ctx context.Context, roomId string) (int64, error) {
	var price int64
	err := r.db.WithContext(ctx).Table("hotel_rooms").
		Where("id = ?", roomId).
		Select("price_per_night").
		Row().
		Scan(&price)
	if err != nil {
		return 0, err
	}
	return price, nil
}

func (r *postgresCartRepo) MarkCartAsPaid(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&CartItemModel{}).
		Where("user_id = ? AND status = 'in_cart'", userID).
		Update("status", "paid").Error
}

func (r *postgresCartRepo) UpdateCartItem(ctx context.Context, itemID, userID string, newCheckIn, newCheckOut string, newPrice int64) error {
	return r.db.WithContext(ctx).Model(&CartItemModel{}).
		Where("id = ? AND user_id = ?", itemID, userID).
		Updates(map[string]interface{}{
			"check_in_date":  newCheckIn,
			"check_out_date": newCheckOut,
			"price":          newPrice,
		}).Error
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

type UserPromoUsageModel struct {
	UserID    string    `gorm:"primaryKey;column:user_id"`
	PromoCode string    `gorm:"primaryKey;column:promo_code"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (UserPromoUsageModel) TableName() string {
	return "user_promo_usages"
}

func (r *postgresCartRepo) HasUserUsedPromo(ctx context.Context, userID, promoCode string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&UserPromoUsageModel{}).
		Where("user_id = ? AND promo_code = ?", userID, promoCode).
		Count(&count).Error
	return count > 0, err
}

func (r *postgresCartRepo) RecordPromoUsage(ctx context.Context, userID, promoCode string) error {
	return r.db.WithContext(ctx).Create(&UserPromoUsageModel{
		UserID:    userID,
		PromoCode: promoCode,
	}).Error
}
