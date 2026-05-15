package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/travelohi/backend/internal/hotel"
)

type PostgresHotelRepository struct {
	db *gorm.DB
}

func NewPostgresHotelRepository(db *gorm.DB) *PostgresHotelRepository {
	return &PostgresHotelRepository{db: db}
}

type HotelWithCount struct {
	hotel.Hotel
	FullCount int32 `gorm:"column:full_count"`
}

func (r *PostgresHotelRepository) SearchHotels(ctx context.Context, filter hotel.SearchFilter) ([]hotel.Hotel, int32, error) {

	// sorting whitelist
	allowedSorts := map[string]string{
		"price":   "starting_price",
		"rating":  "rating_average",
		"reviews": "total_reviews",
	}

	sortCol := "starting_price"
	if mappedCol, exists := allowedSorts[filter.SortBy]; exists {
		sortCol = mappedCol
	}

	sortOrder := "ASC"
	if filter.SortOrder == "desc" {
		sortOrder = "DESC"
	}

	searchParam := "%" + filter.Query + "%"

	sqlQuery := fmt.Sprintf(`
		SELECT 
			h.*, 
			COUNT(*) OVER() as full_count
		FROM hotels h
		WHERE h.name ILIKE ? AND h.id IN (
			SELECT r.hotel_id
			FROM hotel_rooms r
			LEFT JOIN bookings b ON r.id = b.room_id 
				AND b.check_in_date < ? 
				AND b.check_out_date > ?
				AND b.status != 'cancelled'
			GROUP BY r.id, r.capacity
			HAVING (r.capacity - COUNT(b.id)) > 0
		)
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, sortCol, sortOrder)

	var rawResults []HotelWithCount

	err := r.db.Raw(sqlQuery, searchParam, filter.CheckIn, filter.CheckOut, filter.Limit, filter.Offset).
		Scan(&rawResults).Error

	if err != nil {
		return nil, 0, err
	}

	// prevent error
	var totalCount int32 = 0
	if len(rawResults) > 0 {
		totalCount = rawResults[0].FullCount
	}

	domainHotels := make([]hotel.Hotel, len(rawResults))
	for i, raw := range rawResults {
		domainHotels[i] = raw.Hotel
	}

	return domainHotels, totalCount, nil
}
