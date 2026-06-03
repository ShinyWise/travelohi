package repository

import (
	"context"
	"sync"
	"time"

	"github.com/travelohi/backend/internal/telemetry"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SearchHistoryModel struct {
	ID          string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	UserID      string    `gorm:"column:user_id;type:varchar(255);not null"`
	SearchQuery string    `gorm:"column:search_query;type:varchar(255);not null"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (SearchHistoryModel) TableName() string { return "search_histories" }

type GlobalSearchMetricModel struct {
	SearchQuery    string    `gorm:"primaryKey;column:search_query;type:varchar(255)"`
	SearchCount    int64     `gorm:"column:search_count;default:1"`
	LastSearchedAt time.Time `gorm:"column:last_searched_at;autoUpdateTime"`
}

func (GlobalSearchMetricModel) TableName() string { return "global_search_metrics" }

type postgresTelemetryRepo struct {
	db *gorm.DB
}

func NewPostgresTelemetryRepository(db *gorm.DB) telemetry.Repository {
	return &postgresTelemetryRepo{db: db}
}

func (r *postgresTelemetryRepo) LogSearch(ctx context.Context, h *telemetry.SearchHistory) error {
	model := &SearchHistoryModel{
		ID:          h.ID,
		UserID:      h.UserID,
		SearchQuery: h.SearchQuery,
	}
	return r.db.WithContext(ctx).Create(model).Error
}

func (r *postgresTelemetryRepo) UpsertGlobalMetric(ctx context.Context, query string) error {

	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "search_query"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"search_count":     gorm.Expr("search_count + 1"),
			"last_searched_at": time.Now(),
		}),
	}).Create(&GlobalSearchMetricModel{
		SearchQuery: query,
		SearchCount: 1,
	}).Error
}

func (r *postgresTelemetryRepo) GetRecentSearches(ctx context.Context, userID string) ([]string, error) {
	var histories []SearchHistoryModel
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(3).
		Find(&histories).Error

	if err != nil {
		return nil, err
	}

	var queries []string
	for _, h := range histories {
		queries = append(queries, h.SearchQuery)
	}
	return queries, nil
}

func (r *postgresTelemetryRepo) GetTopGlobalSearches(ctx context.Context, limit int) ([]string, error) {
	var metrics []GlobalSearchMetricModel
	err := r.db.WithContext(ctx).
		Order("search_count DESC, last_searched_at DESC").
		Limit(limit).
		Find(&metrics).Error

	if err != nil {
		return nil, err
	}

	var topQueries []string
	for _, m := range metrics {
		topQueries = append(topQueries, m.SearchQuery)
	}
	return topQueries, nil
}

func (r *postgresTelemetryRepo) GetPopularFlightDestinations(ctx context.Context) ([]*telemetry.PopularDestination, error) {
	var results []struct {
		DestinationAirport string
		BookingCount       int64
	}

	// aggregate popular flight destinations
	err := r.db.WithContext(ctx).Table("cart_items").
		Select("flights.destination_airport, COUNT(cart_items.id) as booking_count").
		Joins("JOIN flight_seats ON cart_items.reference_id = flight_seats.id").
		Joins("JOIN flights ON flight_seats.flight_id = flights.id").
		Where("cart_items.item_type = ?", "flight_seat").
		Where("cart_items.status = ?", "paid").
		Group("flights.destination_airport").
		Order("booking_count DESC").
		Limit(5).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	var dests []*telemetry.PopularDestination
	for _, res := range results {
		dests = append(dests, &telemetry.PopularDestination{
			DestinationAirport: res.DestinationAirport,
			BookingCount:       res.BookingCount,
			ImageURL:           "",
		})
	}

	return dests, nil
}

func (r *postgresTelemetryRepo) GetPopularHotels(ctx context.Context) ([]*telemetry.PopularHotel, error) {
	var results []*telemetry.PopularHotel

	// aggregate popular hotels
	err := r.db.WithContext(ctx).Table("cart_items").
		Select("hotels.id as hotel_id, hotels.name, hotels.address as location, coalesce('data:image/jpeg;base64,' || encode(hotels.pictures[1], 'base64'), '') as image_url, COUNT(cart_items.id) as booking_count").
		Joins("JOIN hotel_rooms ON cart_items.reference_id = hotel_rooms.id").
		Joins("JOIN hotels ON hotel_rooms.hotel_id = hotels.id").
		Where("cart_items.item_type = ?", "hotel_room").
		Where("cart_items.status = ?", "paid").
		Group("hotels.id, hotels.name, hotels.address, hotels.pictures").
		Order("booking_count DESC").
		Limit(5).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	return results, nil
}

func (r *postgresTelemetryRepo) GlobalSearch(ctx context.Context, query string) ([]*telemetry.HotelSearchResult, []*telemetry.AirlineSearchResult, error) {
	searchTerm := "%" + query + "%"

	var hotels []*telemetry.HotelSearchResult
	var airlines []*telemetry.AirlineSearchResult
	var errHotels, errAirlines error

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		errHotels = r.db.WithContext(ctx).Table("hotels").
			Select("id, name, address as location, coalesce('data:image/jpeg;base64,' || encode(pictures[1], 'base64'), '') as image_url").
			Where("name ILIKE ? OR address ILIKE ?", searchTerm, searchTerm).
			Limit(5).
			Scan(&hotels).Error
	}()

	go func() {
		defer wg.Done()

		var airlineMatches []*telemetry.AirlineSearchResult
		var destMatches []*telemetry.AirlineSearchResult

		err1 := r.db.WithContext(ctx).Table("airlines").
			Select("id, name, coalesce('data:image/jpeg;base64,' || encode(logo, 'base64'), '') as logo_url").
			Where("name ILIKE ?", searchTerm).
			Limit(3).
			Scan(&airlineMatches).Error

		err2 := r.db.WithContext(ctx).Table("flights").
			Select("MAX(id) as id, destination_airport as name, '' as logo_url").
			Where("destination_airport ILIKE ?", searchTerm).
			Group("destination_airport").
			Limit(3).
			Scan(&destMatches).Error

		if err1 != nil {
			errAirlines = err1
			return
		}
		if err2 != nil {
			errAirlines = err2
			return
		}

		airlines = append(airlines, airlineMatches...)
		airlines = append(airlines, destMatches...)
	}()

	wg.Wait()

	if errHotels != nil {
		return nil, nil, errHotels
	}
	if errAirlines != nil {
		return nil, nil, errAirlines
	}

	return hotels, airlines, nil
}
