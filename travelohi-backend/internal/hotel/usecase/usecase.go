package usecase

import (
	"context"

	"github.com/travelohi/backend/internal/hotel"
)

type HotelUseCase struct {
	repo hotel.HotelRepository
}

func NewHotelUseCase(repo hotel.HotelRepository) hotel.HotelUseCase {
	return &HotelUseCase{repo: repo}
}

func (uc *HotelUseCase) SearchHotels(ctx context.Context, filter hotel.SearchFilter) ([]hotel.Hotel, int32, error) {
	return uc.repo.SearchHotels(ctx, filter)
}

func (uc *HotelUseCase) GetHotelDetails(ctx context.Context, hotelID string, checkIn, checkOut string) (hotel.Hotel, []hotel.HotelRoom, []hotel.HotelReview, error) {
	h, err := uc.repo.GetHotelByID(ctx, hotelID)
	if err != nil {
		return hotel.Hotel{}, nil, nil, err
	}

	rooms, err := uc.repo.GetAvailableRooms(ctx, hotelID, checkIn, checkOut)
	if err != nil {
		return hotel.Hotel{}, nil, nil, err
	}

	reviews, err := uc.repo.GetRecentReviews(ctx, hotelID)
	if err != nil {
		return hotel.Hotel{}, nil, nil, err
	}

	return h, rooms, reviews, nil
}

func (uc *HotelUseCase) AddHotelReview(ctx context.Context, review hotel.HotelReview, bookingID string) error {
	return uc.repo.AddHotelReview(ctx, review, bookingID)
}
