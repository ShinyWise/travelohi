package telemetry

import (
	"context"
	"time"

	telemetrypb "github.com/travelohi/backend/proto/telemetry/v1"
)

type SearchHistory struct {
	ID          string
	UserID      string
	SearchQuery string
	CreatedAt   time.Time
}

type PopularDestination struct {
	DestinationAirport string
	BookingCount       int64
	ImageURL           string
}

type PopularHotel struct {
	HotelID      string
	Name         string
	Location     string
	ImageURL     string
	BookingCount int64
}

type HotelSearchResult struct {
	ID       string
	Name     string
	Location string
	ImageURL string
}

type AirlineSearchResult struct {
	ID      string
	Name    string
	LogoURL string
}

type CacheRepository interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
}

type Repository interface {
	LogSearch(ctx context.Context, history *SearchHistory) error
	UpsertGlobalMetric(ctx context.Context, query string) error
	GetRecentSearches(ctx context.Context, userID string) ([]string, error)
	GetTopGlobalSearches(ctx context.Context, limit int) ([]string, error)
	GetPopularFlightDestinations(ctx context.Context) ([]*PopularDestination, error)
	GetPopularHotels(ctx context.Context) ([]*PopularHotel, error)
	GlobalSearch(ctx context.Context, query string) ([]*HotelSearchResult, []*AirlineSearchResult, error)
}

type UseCase interface {
	LogSearchQuery(ctx context.Context, req *telemetrypb.LogSearchQueryRequest) error
	GetRecentSearches(ctx context.Context, req *telemetrypb.GetRecentSearchesRequest) (*telemetrypb.GetRecentSearchesResponse, error)
	GetGlobalRecommendations(ctx context.Context, req *telemetrypb.GetGlobalRecommendationsRequest) (*telemetrypb.GetGlobalRecommendationsResponse, error)
	GetPopularFlightDestinations(ctx context.Context, req *telemetrypb.GetPopularFlightsRequest) (*telemetrypb.GetPopularFlightsResponse, error)
	GetPopularHotels(ctx context.Context, req *telemetrypb.GetPopularHotelsRequest) (*telemetrypb.GetPopularHotelsResponse, error)
	GlobalSearch(ctx context.Context, query string) ([]*HotelSearchResult, []*AirlineSearchResult, error)
}
