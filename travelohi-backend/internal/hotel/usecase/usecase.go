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
