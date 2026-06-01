package handler

import (
	"context"

	"github.com/travelohi/backend/internal/telemetry"
	telemetrypb "github.com/travelohi/backend/proto/telemetry/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type TelemetryHandler struct {
	telemetrypb.UnimplementedTelemetryServiceServer
	usecase telemetry.UseCase
}

func NewTelemetryHandler(usecase telemetry.UseCase) *TelemetryHandler {
	return &TelemetryHandler{
		usecase: usecase,
	}
}

func (h *TelemetryHandler) LogSearchQuery(ctx context.Context, req *telemetrypb.LogSearchQueryRequest) (*telemetrypb.TelemetryResponse, error) {
	if req.GetUserId() == "" || req.GetQuery() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "user_id and query are required")
	}

	err := h.usecase.LogSearchQuery(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to log search query: %v", err)
	}

	return &telemetrypb.TelemetryResponse{Success: true}, nil
}

func (h *TelemetryHandler) GetRecentSearches(ctx context.Context, req *telemetrypb.GetRecentSearchesRequest) (*telemetrypb.GetRecentSearchesResponse, error) {
	if req.GetUserId() == "" {
		return nil, status.Errorf(codes.InvalidArgument, "user_id is required")
	}

	res, err := h.usecase.GetRecentSearches(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to retrieve recent searches: %v", err)
	}

	return res, nil
}

func (h *TelemetryHandler) GetGlobalRecommendations(ctx context.Context, req *telemetrypb.GetGlobalRecommendationsRequest) (*telemetrypb.GetGlobalRecommendationsResponse, error) {
	res, err := h.usecase.GetGlobalRecommendations(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch global recommendations: %v", err)
	}

	return res, nil
}



func (h *TelemetryHandler) GetPopularFlightDestinations(ctx context.Context, req *telemetrypb.GetPopularFlightsRequest) (*telemetrypb.GetPopularFlightsResponse, error) {
	res, err := h.usecase.GetPopularFlightDestinations(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch popular flight destinations: %v", err)
	}

	return res, nil
}



func (h *TelemetryHandler) GetPopularHotels(ctx context.Context, req *telemetrypb.GetPopularHotelsRequest) (*telemetrypb.GetPopularHotelsResponse, error) {
	res, err := h.usecase.GetPopularHotels(ctx, req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch popular hotels: %v", err)
	}

	return res, nil
}

func (h *TelemetryHandler) GlobalSearch(ctx context.Context, req *telemetrypb.GlobalSearchRequest) (*telemetrypb.GlobalSearchResponse, error) {
	query := req.GetQuery()
	hotels, airlines, err := h.usecase.GlobalSearch(ctx, query)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to execute global search: %v", err)
	}

	pbHotels := make([]*telemetrypb.HotelSearchResult, len(hotels))
	for i, hotel := range hotels {
		pbHotels[i] = &telemetrypb.HotelSearchResult{
			Id:       hotel.ID,
			Name:     hotel.Name,
			Location: hotel.Location,
			ImageUrl: hotel.ImageURL,
		}
	}

	pbAirlines := make([]*telemetrypb.AirlineSearchResult, len(airlines))
	for i, airline := range airlines {
		pbAirlines[i] = &telemetrypb.AirlineSearchResult{
			Id:      airline.ID,
			Name:    airline.Name,
			LogoUrl: airline.LogoURL,
		}
	}

	return &telemetrypb.GlobalSearchResponse{
		Hotels:   pbHotels,
		Airlines: pbAirlines,
	}, nil
}

