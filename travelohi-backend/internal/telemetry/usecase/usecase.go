package usecase

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/telemetry"
	telemetrypb "github.com/travelohi/backend/proto/telemetry/v1"
)

const topSearchesCacheKey = "telemetry:top_global_searches"

type telemetryUseCase struct {
	repo  telemetry.Repository
	cache telemetry.CacheRepository
}

func NewTelemetryUseCase(repo telemetry.Repository, cache telemetry.CacheRepository) telemetry.UseCase {
	return &telemetryUseCase{
		repo:  repo,
		cache: cache,
	}
}

func (u *telemetryUseCase) LogSearchQuery(ctx context.Context, req *telemetrypb.LogSearchQueryRequest) error {
	query := req.GetQuery()
	userID := req.GetUserId()

	if query == "" {
		return nil
	}

	// insert ke personal search history
	history := &telemetry.SearchHistory{
		ID:          uuid.New().String(),
		UserID:      userID,
		SearchQuery: query,
	}

	if err := u.repo.LogSearch(ctx, history); err != nil {
		return err
	}

	// upsert global metrics
	go func(q string) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := u.repo.UpsertGlobalMetric(bgCtx, q); err != nil {
			log.Printf("[Telemetry] Failed to upsert global metric for query '%s': %v", q, err)
		}
	}(query)

	return nil
}

func (u *telemetryUseCase) GetRecentSearches(ctx context.Context, req *telemetrypb.GetRecentSearchesRequest) (*telemetrypb.GetRecentSearchesResponse, error) {
	queries, err := u.repo.GetRecentSearches(ctx, req.GetUserId())
	if err != nil {
		return nil, err
	}

	return &telemetrypb.GetRecentSearchesResponse{
		Queries: queries,
	}, nil
}

func (u *telemetryUseCase) GetGlobalRecommendations(ctx context.Context, req *telemetrypb.GetGlobalRecommendationsRequest) (*telemetrypb.GetGlobalRecommendationsResponse, error) {
	// cache first approach
	cachedBytes, err := u.cache.Get(ctx, topSearchesCacheKey)
	if err == nil && cachedBytes != nil {
		var cachedQueries []string
		if unmarshalErr := json.Unmarshal(cachedBytes, &cachedQueries); unmarshalErr == nil {
			return &telemetrypb.GetGlobalRecommendationsResponse{
				RecommendedQueries: cachedQueries,
			}, nil
		}
	}

	// fetch from database
	topQueries, err := u.repo.GetTopGlobalSearches(ctx, 5)
	if err != nil {
		return nil, err
	}

	// update cache asynchronously
	go func(queries []string) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if jsonBytes, err := json.Marshal(queries); err == nil {
			_ = u.cache.Set(bgCtx, topSearchesCacheKey, jsonBytes, 5*time.Minute)
		}
	}(topQueries)

	return &telemetrypb.GetGlobalRecommendationsResponse{
		RecommendedQueries: topQueries,
	}, nil
}

const popularFlightsCacheKey = "telemetry:popular_flights"

func (u *telemetryUseCase) GetPopularFlightDestinations(ctx context.Context, req *telemetrypb.GetPopularFlightsRequest) (*telemetrypb.GetPopularFlightsResponse, error) {
	// check memcached first
	cachedBytes, err := u.cache.Get(ctx, popularFlightsCacheKey)
	if err == nil && cachedBytes != nil {
		var cachedDests []*telemetrypb.GetPopularFlightsResponse_PopularDestination
		if unmarshalErr := json.Unmarshal(cachedBytes, &cachedDests); unmarshalErr == nil {
			return &telemetrypb.GetPopularFlightsResponse{
				Destinations: cachedDests,
			}, nil
		}
	}

	// execute aggregation query
	domainDests, err := u.repo.GetPopularFlightDestinations(ctx)
	if err != nil {
		return nil, err
	}

	// map to protobuf
	var pbDests []*telemetrypb.GetPopularFlightsResponse_PopularDestination
	for _, d := range domainDests {
		pbDests = append(pbDests, &telemetrypb.GetPopularFlightsResponse_PopularDestination{
			DestinationAirport: d.DestinationAirport,
			ImageUrl:           d.ImageURL,
			BookingCount:       d.BookingCount,
		})
	}

	// update cache asynchronously
	go func(dests []*telemetrypb.GetPopularFlightsResponse_PopularDestination) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if jsonBytes, err := json.Marshal(dests); err == nil {
			_ = u.cache.Set(bgCtx, popularFlightsCacheKey, jsonBytes, 1*time.Hour)
		}
	}(pbDests)

	return &telemetrypb.GetPopularFlightsResponse{
		Destinations: pbDests,
	}, nil
}

const popularHotelsCacheKey = "telemetry:popular_hotels"

func (u *telemetryUseCase) GetPopularHotels(ctx context.Context, req *telemetrypb.GetPopularHotelsRequest) (*telemetrypb.GetPopularHotelsResponse, error) {
	// check memcached first
	cachedBytes, err := u.cache.Get(ctx, popularHotelsCacheKey)
	if err == nil && cachedBytes != nil {
		var cachedHotels []*telemetrypb.GetPopularHotelsResponse_PopularHotel
		if unmarshalErr := json.Unmarshal(cachedBytes, &cachedHotels); unmarshalErr == nil {
			return &telemetrypb.GetPopularHotelsResponse{
				Hotels: cachedHotels,
			}, nil
		}
	}

	// execute aggregation query
	domainHotels, err := u.repo.GetPopularHotels(ctx)
	if err != nil {
		return nil, err
	}

	// map to protobuf
	var pbHotels []*telemetrypb.GetPopularHotelsResponse_PopularHotel
	for _, h := range domainHotels {
		pbHotels = append(pbHotels, &telemetrypb.GetPopularHotelsResponse_PopularHotel{
			HotelId:      h.HotelID,
			Name:         h.Name,
			Location:     h.Location,
			ImageUrl:     h.ImageURL,
			BookingCount: h.BookingCount,
		})
	}

	// update cache asynchronously
	go func(hotels []*telemetrypb.GetPopularHotelsResponse_PopularHotel) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if jsonBytes, err := json.Marshal(hotels); err == nil {
			_ = u.cache.Set(bgCtx, popularHotelsCacheKey, jsonBytes, 1*time.Hour)
		}
	}(pbHotels)

	return &telemetrypb.GetPopularHotelsResponse{
		Hotels: pbHotels,
	}, nil
}

type CachedSearchResult struct {
	Hotels   []*telemetry.HotelSearchResult   `json:"hotels"`
	Airlines []*telemetry.AirlineSearchResult `json:"airlines"`
}

func (u *telemetryUseCase) GlobalSearch(ctx context.Context, query string) ([]*telemetry.HotelSearchResult, []*telemetry.AirlineSearchResult, error) {
	cacheKey := "telemetry:search:" + query

	cachedBytes, err := u.cache.Get(ctx, cacheKey)
	if err == nil && cachedBytes != nil {
		var cached CachedSearchResult
		if unmarshalErr := json.Unmarshal(cachedBytes, &cached); unmarshalErr == nil {
			return cached.Hotels, cached.Airlines, nil
		}
	}

	hotels, airlines, err := u.repo.GlobalSearch(ctx, query)
	if err != nil {
		return nil, nil, err
	}

	go func(h []*telemetry.HotelSearchResult, a []*telemetry.AirlineSearchResult) {
		bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		cached := CachedSearchResult{
			Hotels:   h,
			Airlines: a,
		}
		if jsonBytes, err := json.Marshal(cached); err == nil {
			_ = u.cache.Set(bgCtx, cacheKey, jsonBytes, 5*time.Minute)
		}
	}(hotels, airlines)

	return hotels, airlines, nil
}

