package repository

import (
	"context"
	"database/sql/driver"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/travelohi/backend/internal/hotel"
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

type HotelModel struct {
	ID                string `gorm:"primaryKey"`
	Name              string
	Description       string
	Address           string
	Pictures          ByteaArray `gorm:"column:pictures;type:bytea[]"`
	Facilities        []string `gorm:"column:facilities;type:jsonb;serializer:json"`
	RatingCleanliness float32  `gorm:"column:rating_cleanliness"`
	RatingComfort     float32  `gorm:"column:rating_comfort"`
	RatingLocation    float32  `gorm:"column:rating_location"`
	RatingService     float32  `gorm:"column:rating_service"`
	RatingAverage     float32  `gorm:"column:rating_average"`
	TotalReviews      int32    `gorm:"column:total_reviews"`
	StartingPrice     int64    `gorm:"column:starting_price"`
}

func (HotelModel) TableName() string { return "hotels" }

type HotelRoomModel struct {
	ID             string `gorm:"primaryKey"`
	HotelID        string `gorm:"column:hotel_id"`
	Name           string
	PricePerNight  int64 `gorm:"column:price_per_night"`
	Capacity       int32
	Facilities     []string `gorm:"column:facilities;type:jsonb;serializer:json"`
	Picture        []byte   `gorm:"column:picture;type:bytea"`
	TotalInventory int32    `gorm:"column:total_inventory;default:5"`
}

func (HotelRoomModel) TableName() string { return "hotel_rooms" }

type HotelReviewModel struct {
	ID                string  `gorm:"primaryKey"`
	HotelID           string  `gorm:"column:hotel_id"`
	UserID            string  `gorm:"column:user_id"`
	UserName          string  `gorm:"column:user_name"`
	RatingCleanliness float32 `gorm:"column:rating_cleanliness"`
	RatingComfort     float32 `gorm:"column:rating_comfort"`
	RatingLocation    float32 `gorm:"column:rating_location"`
	RatingService     float32 `gorm:"column:rating_service"`
	RatingAverage     float32 `gorm:"column:rating_average"`
	Comment           string
	CreatedAt         time.Time `gorm:"column:created_at"`
}

func (HotelReviewModel) TableName() string { return "hotel_reviews" }

type PostgresHotelRepository struct {
	db *gorm.DB
}

func NewPostgresHotelRepository(db *gorm.DB) *PostgresHotelRepository {
	return &PostgresHotelRepository{db: db}
}

type HotelWithCount struct {
	ID                string `gorm:"primaryKey"`
	Name              string
	Description       string
	Address           string
	Facilities        []string `gorm:"column:facilities;type:jsonb;serializer:json"`
	RatingCleanliness float32  `gorm:"column:rating_cleanliness"`
	RatingComfort     float32  `gorm:"column:rating_comfort"`
	RatingLocation    float32  `gorm:"column:rating_location"`
	RatingService     float32  `gorm:"column:rating_service"`
	RatingAverage     float32  `gorm:"column:rating_average"`
	TotalReviews      int32    `gorm:"column:total_reviews"`
	StartingPrice     int64    `gorm:"column:starting_price"`
	Thumbnail         []byte   `gorm:"column:thumbnail"`
	FullCount         int32    `gorm:"column:full_count"`
	Availability      int32    `gorm:"column:availability"`
}

func (r *PostgresHotelRepository) SearchHotels(ctx context.Context, filter hotel.SearchFilter) ([]hotel.Hotel, int32, error) {
	checkIn := filter.CheckIn
	if checkIn == "" {
		checkIn = time.Now().Format("2006-01-02")
	}
	checkOut := filter.CheckOut
	if checkOut == "" {
		checkOut = time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	}

	searchParam := "%" + filter.Query + "%"

	sqlQuery := `
		SELECT 
			h.id, h.name, h.description, h.address, h.facilities,
			h.rating_cleanliness, h.rating_comfort, h.rating_location, h.rating_service, h.rating_average,
			h.total_reviews, h.starting_price,
			h.pictures[1] as thumbnail,
			COUNT(*) OVER() as full_count,
			COALESCE(avail.total_available, 0) as availability
		FROM hotels h
		JOIN (
			SELECT r.hotel_id, SUM(r.total_inventory - COALESCE(b.booked_count, 0)) as total_available
			FROM hotel_rooms r
			LEFT JOIN (
				SELECT room_id, COUNT(*) as booked_count
				FROM bookings
				WHERE check_in_date < ? AND check_out_date > ? AND status != 'cancelled'
				GROUP BY room_id
			) b ON r.id = b.room_id
			GROUP BY r.hotel_id
		) avail ON h.id = avail.hotel_id
		WHERE avail.total_available > 0 AND (h.name ILIKE ? OR h.address ILIKE ?)
	`

	var args []interface{}
	args = append(args, checkOut, checkIn, searchParam, searchParam)

	// Price filters
	if filter.MinPrice > 0 {
		sqlQuery += " AND h.starting_price >= ?"
		args = append(args, filter.MinPrice)
	}
	if filter.MaxPrice > 0 {
		sqlQuery += " AND h.starting_price <= ?"
		args = append(args, filter.MaxPrice)
	}

	// Rating filter
	if filter.MinRating > 0 {
		sqlQuery += " AND h.rating_average >= ?"
		args = append(args, filter.MinRating)
	}

	// Facilities filter
	if len(filter.Facilities) > 0 {
		facJSON, _ := json.Marshal(filter.Facilities)
		sqlQuery += " AND h.facilities @> ?::jsonb"
		args = append(args, string(facJSON))
	}

	// Sorting
	allowedSorts := map[string]string{
		"price":        "h.starting_price",
		"rating":       "h.rating_average",
		"reviews":      "h.total_reviews",
		"availability": "avail.total_available",
	}

	sortCol := "h.starting_price"
	if mappedCol, exists := allowedSorts[filter.SortBy]; exists {
		sortCol = mappedCol
	}

	sortOrder := "ASC"
	if filter.SortOrder == "desc" {
		sortOrder = "DESC"
	}
	if (filter.SortBy == "availability" || filter.SortBy == "reviews" || filter.SortBy == "rating") && filter.SortOrder == "" {
		sortOrder = "DESC"
	}

	sqlQuery += fmt.Sprintf(" ORDER BY %s %s LIMIT ? OFFSET ?", sortCol, sortOrder)
	args = append(args, filter.Limit, filter.Offset)

	var rawResults []HotelWithCount

	err := r.db.WithContext(ctx).Raw(sqlQuery, args...).Scan(&rawResults).Error
	if err != nil {
		return nil, 0, err
	}

	var totalCount int32 = 0
	if len(rawResults) > 0 {
		totalCount = rawResults[0].FullCount
	}

	domainHotels := make([]hotel.Hotel, len(rawResults))
	for i, raw := range rawResults {
		var pictureURLs []string
		if len(raw.Thumbnail) > 0 {
			pictureURLs = []string{"data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(raw.Thumbnail)}
		}

		domainHotels[i] = hotel.Hotel{
			ID:                raw.ID,
			Name:              raw.Name,
			Description:       raw.Description,
			Address:           raw.Address,
			PictureURLs:       pictureURLs,
			Facilities:        raw.Facilities,
			RatingCleanliness: raw.RatingCleanliness,
			RatingComfort:     raw.RatingComfort,
			RatingLocation:    raw.RatingLocation,
			RatingService:     raw.RatingService,
			RatingAverage:     raw.RatingAverage,
			TotalReviews:      raw.TotalReviews,
			StartingPrice:     raw.StartingPrice,
			Availability:      raw.Availability,
		}
	}

	return domainHotels, totalCount, nil
}

func (r *PostgresHotelRepository) GetHotelByID(ctx context.Context, id string) (hotel.Hotel, error) {
	var m HotelModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error; err != nil {
		return hotel.Hotel{}, err
	}

	pictureURLs := make([]string, len(m.Pictures))
	for j, picBytes := range m.Pictures {
		pictureURLs[j] = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(picBytes)
	}

	return hotel.Hotel{
		ID:                m.ID,
		Name:              m.Name,
		Description:       m.Description,
		Address:           m.Address,
		PictureURLs:       pictureURLs,
		Facilities:        m.Facilities,
		RatingCleanliness: m.RatingCleanliness,
		RatingComfort:     m.RatingComfort,
		RatingLocation:    m.RatingLocation,
		RatingService:     m.RatingService,
		RatingAverage:     m.RatingAverage,
		TotalReviews:      m.TotalReviews,
		StartingPrice:     m.StartingPrice,
	}, nil
}

func (r *PostgresHotelRepository) GetAvailableRooms(ctx context.Context, hotelID string, checkIn, checkOut string) ([]hotel.HotelRoom, error) {
	var models []HotelRoomModel

	err := r.db.WithContext(ctx).Raw(`
		SELECT r.*
		FROM hotel_rooms r
		LEFT JOIN bookings b ON r.id = b.room_id
			AND b.check_in_date < ?
			AND b.check_out_date > ?
			AND b.status != 'cancelled'
		WHERE r.hotel_id = ?
		GROUP BY r.id, r.hotel_id, r.name, r.price_per_night, r.capacity, r.facilities, r.picture, r.total_inventory
		HAVING (r.total_inventory - COUNT(b.id)) > 0
	`, checkOut, checkIn, hotelID).Scan(&models).Error

	if err != nil {
		return nil, err
	}

	rooms := make([]hotel.HotelRoom, len(models))
	for i, m := range models {
		var bookedCount int64
		r.db.WithContext(ctx).Table("bookings").
			Where("room_id = ? AND check_in_date < ? AND check_out_date > ? AND status != 'cancelled'", m.ID, checkOut, checkIn).
			Count(&bookedCount)

		var pictureURI string
		if len(m.Picture) > 0 {
			pictureURI = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(m.Picture)
		}

		rooms[i] = hotel.HotelRoom{
			ID:             m.ID,
			HotelID:        m.HotelID,
			Name:           m.Name,
			PricePerNight:  m.PricePerNight,
			Capacity:       m.Capacity,
			Facilities:     m.Facilities,
			AvailableCount: m.TotalInventory - int32(bookedCount),
			ImageURL:       pictureURI,
		}
	}
	return rooms, nil
}

func (r *PostgresHotelRepository) GetRecentReviews(ctx context.Context, hotelID string) ([]hotel.HotelReview, error) {
	var models []HotelReviewModel
	err := r.db.WithContext(ctx).
		Where("hotel_id = ?", hotelID).
		Order("created_at DESC").
		Find(&models).Error
	if err != nil {
		return nil, err
	}

	reviews := make([]hotel.HotelReview, len(models))
	for i, m := range models {
		reviews[i] = hotel.HotelReview{
			ID:                m.ID,
			HotelID:           m.HotelID,
			UserID:            m.UserID,
			UserName:          m.UserName,
			RatingCleanliness: m.RatingCleanliness,
			RatingComfort:     m.RatingComfort,
			RatingLocation:    m.RatingLocation,
			RatingService:     m.RatingService,
			RatingAverage:     m.RatingAverage,
			Comment:           m.Comment,
			CreatedAt:         m.CreatedAt,
		}
	}
	return reviews, nil
}

func (r *PostgresHotelRepository) AddHotelReview(ctx context.Context, rev hotel.HotelReview, bookingID string) error {
	m := HotelReviewModel{
		ID:                rev.ID,
		HotelID:           rev.HotelID,
		UserID:            rev.UserID,
		UserName:          rev.UserName,
		RatingCleanliness: rev.RatingCleanliness,
		RatingComfort:     rev.RatingComfort,
		RatingLocation:    rev.RatingLocation,
		RatingService:     rev.RatingService,
		RatingAverage:     rev.RatingAverage,
		Comment:           rev.Comment,
		CreatedAt:         rev.CreatedAt,
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&m).Error; err != nil {
			return err
		}

		if bookingID != "" {
			if err := tx.Table("booking_models").Where("id = ?", bookingID).Update("status", "reviewed").Error; err != nil {
				return err
			}
		}

		var ratings struct {
			Cleanliness float64 `gorm:"column:c"`
			Comfort     float64 `gorm:"column:co"`
			Location    float64 `gorm:"column:l"`
			Service     float64 `gorm:"column:s"`
			Average     float64 `gorm:"column:a"`
			Count       int64   `gorm:"column:cnt"`
		}

		err := tx.Table("hotel_reviews").
			Select("AVG(rating_cleanliness) as c, AVG(rating_comfort) as co, AVG(rating_location) as l, AVG(rating_service) as s, AVG(rating_average) as a, COUNT(id) as cnt").
			Where("hotel_id = ?", rev.HotelID).
			Scan(&ratings).Error
		if err != nil {
			return err
		}

		return tx.Table("hotels").Where("id = ?", rev.HotelID).Updates(map[string]interface{}{
			"rating_cleanliness": ratings.Cleanliness,
			"rating_comfort":     ratings.Comfort,
			"rating_location":    ratings.Location,
			"rating_service":     ratings.Service,
			"rating_average":     ratings.Average,
			"total_reviews":      ratings.Count,
		}).Error
	})
}
