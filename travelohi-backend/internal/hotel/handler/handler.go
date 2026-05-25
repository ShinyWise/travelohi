package handler

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/hotel"
	"github.com/travelohi/backend/pkg/utils"
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
		Query:      req.Query,
		CheckIn:    req.CheckInDate,
		CheckOut:   req.CheckOutDate,
		SortBy:     req.SortBy,
		SortOrder:  req.SortOrder,
		Limit:      limit,
		Offset:     offset,
		MinPrice:   req.MinPrice,
		MaxPrice:   req.MaxPrice,
		MinRating:  req.MinRating,
		Facilities: req.Facilities,
	}

	domainHotels, totalCount, err := h.usecase.SearchHotels(ctx, filter)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to search hotels")
	}

	// map domain result to gRPC format
	grpcHotels := make([]*hotelpb.Hotel, len(domainHotels))
	for i, val := range domainHotels {
		grpcHotels[i] = &hotelpb.Hotel{
			Id:                val.ID,
			Name:              val.Name,
			Description:       val.Description,
			Address:           val.Address,
			PictureUrls:       val.PictureURLs,
			Facilities:        val.Facilities,
			RatingCleanliness: val.RatingCleanliness,
			RatingComfort:     val.RatingComfort,
			RatingLocation:    val.RatingLocation,
			RatingService:     val.RatingService,
			RatingAverage:     val.RatingAverage,
			TotalReviews:      val.TotalReviews,
			StartingPrice:     val.StartingPrice,
			Availability:      val.Availability,
		}
	}
	return &hotelpb.SearchHotelsResponse{
		Hotels:       grpcHotels,
		TotalResults: totalCount,
	}, nil
}

func (h *HotelHandler) GetHotelDetails(ctx context.Context, req *hotelpb.GetHotelDetailsRequest) (*hotelpb.GetHotelDetailsResponse, error) {
	hDetails, rooms, reviews, err := h.usecase.GetHotelDetails(ctx, req.HotelId, req.CheckInDate, req.CheckOutDate)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get hotel details: %v", err)
	}

	grpcHotel := &hotelpb.Hotel{
		Id:                hDetails.ID,
		Name:              hDetails.Name,
		Description:       hDetails.Description,
		Address:           hDetails.Address,
		PictureUrls:       hDetails.PictureURLs,
		Facilities:        hDetails.Facilities,
		RatingCleanliness: hDetails.RatingCleanliness,
		RatingComfort:     hDetails.RatingComfort,
		RatingLocation:    hDetails.RatingLocation,
		RatingService:     hDetails.RatingService,
		RatingAverage:     hDetails.RatingAverage,
		TotalReviews:      hDetails.TotalReviews,
		StartingPrice:     hDetails.StartingPrice,
	}

	grpcRooms := make([]*hotelpb.HotelRoom, len(rooms))
	for i, r := range rooms {
		grpcRooms[i] = &hotelpb.HotelRoom{
			Id:             r.ID,
			HotelId:        r.HotelID,
			Name:           r.Name,
			PricePerNight:  r.PricePerNight,
			Capacity:       r.Capacity,
			Facilities:     r.Facilities,
			AvailableCount: r.AvailableCount,
			ImageUrl:       r.ImageURL,
		}
	}

	grpcReviews := make([]*hotelpb.HotelReview, len(reviews))
	for i, rev := range reviews {
		grpcReviews[i] = &hotelpb.HotelReview{
			Id:                rev.ID,
			HotelId:           rev.HotelID,
			UserId:            rev.UserID,
			UserName:          rev.UserName,
			RatingCleanliness: rev.RatingCleanliness,
			RatingComfort:     rev.RatingComfort,
			RatingLocation:    rev.RatingLocation,
			RatingService:     rev.RatingService,
			RatingAverage:     rev.RatingAverage,
			Comment:           rev.Comment,
			CreatedAt:         rev.CreatedAt.Format(time.RFC3339),
		}
	}

	return &hotelpb.GetHotelDetailsResponse{
		Hotel:          grpcHotel,
		AvailableRooms: grpcRooms,
		RecentReviews:  grpcReviews,
	}, nil
}

func (h *HotelHandler) AddHotelReview(ctx context.Context, req *hotelpb.AddHotelReviewRequest) (*hotelpb.AddHotelReviewResponse, error) {
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "unauthenticated: %v", err)
	}

	avg := (req.RatingCleanliness + req.RatingComfort + req.RatingLocation + req.RatingService) / 4.0

	userName := "Traveler"
	if req.IsAnonymous {
		userName = "Anonymous"
	}

	rev := hotel.HotelReview{
		ID:                uuid.New().String(),
		HotelID:           req.HotelId,
		UserID:            userID,
		UserName:          userName,
		RatingCleanliness: req.RatingCleanliness,
		RatingComfort:     req.RatingComfort,
		RatingLocation:    req.RatingLocation,
		RatingService:     req.RatingService,
		RatingAverage:     avg,
		Comment:           req.Comment,
		CreatedAt:         time.Now(),
	}

	err = h.usecase.AddHotelReview(ctx, rev)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to add hotel review: %v", err)
	}

	return &hotelpb.AddHotelReviewResponse{
		Success: true,
		Message: "Review added successfully",
	}, nil
}
