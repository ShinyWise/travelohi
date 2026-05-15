package handler

import (
	"context"

	"github.com/travelohi/backend/internal/hotel"
	hotelpb "github.com/travelohi/backend/proto/hotel/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type HotelHandler struct {
	hotelpb.UnimplementedHotelServiceServer
	usecase hotel.HotelUseCase
}

func NewHotelHandler(usecase hotel.HotelUseCase) *HotelHandler {
	return &HotelHandler{usecase: usecase}
}

func (h *HotelHandler) SearchHotels(ctx context.Context, req *hotelpb.SearchHotelsRequest) (*hotelpb.SearchHotelsResponse, error) {

	// boundaries
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	offset := req.Offset
	if offset < 0 {
		offset = 0
	}

	// domain filter
	filter := hotel.SearchFilter{
		Query:     req.Query,
		CheckIn:   req.CheckInDate,
		CheckOut:  req.CheckOutDate,
		SortBy:    req.SortBy,
		SortOrder: req.SortOrder,
		Limit:     limit,
		Offset:    offset,
	}

	domainHotels, totalCount, err := h.usecase.SearchHotels(ctx, filter)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to search hotels")
	}

	// map domain result to gRPC format
	grpcHotels := make([]*hotelpb.Hotel, len(domainHotels))
	for i, h := range domainHotels {
		grpcHotels[i] = &hotelpb.Hotel{
			Id:                h.ID,
			Name:              h.Name,
			Description:       h.Description,
			Address:           h.Address,
			PictureUrls:       h.PictureURLs,
			Facilities:        h.Facilities,
			RatingCleanliness: h.RatingCleanliness,
			RatingComfort:     h.RatingComfort,
			RatingLocation:    h.RatingLocation,
			RatingService:     h.RatingService,
			RatingAverage:     h.RatingAverage,
			TotalReviews:      h.TotalReviews,
			StartingPrice:     h.StartingPrice,
		}
	}
	return &hotelpb.SearchHotelsResponse{
		Hotels:       grpcHotels,
		TotalResults: totalCount,
	}, nil
}
