package usecase

import (
	"context"
	"strings"

	"github.com/travelohi/backend/internal/flight"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type flightUseCase struct {
	repo flight.FlightRepository
}

func NewFlightUseCase(repo flight.FlightRepository) flight.FlightUseCase {
	return &flightUseCase{repo: repo}
}

// search flights
func (uc *flightUseCase) SearchFlights(ctx context.Context, origin, dest, date string, limit, offset int32) ([]flight.Flight, int32, error) {
	return uc.repo.SearchFlights(ctx, origin, dest, date, limit, offset)
}

// book seat
func (uc *flightUseCase) BookSeat(ctx context.Context, seatID string, userID string) (int64, error) {

	// call the lock transaction
	price, err := uc.repo.LockAndBookSeat(ctx, seatID)

	if err != nil {
		// translate pg lock error
		if strings.Contains(err.Error(), "could not obtain lock") || strings.Contains(err.Error(), "already permanently booked") {
			return 0, status.Error(codes.Aborted, "Seat is currently being reserved or is already booked.")
		}

		return 0, status.Error(codes.Internal, "An unexpected error occurred while booking the seat.")
	}

	return price, nil
}

func (uc *flightUseCase) UnlockSeat(ctx context.Context, seatID string) error {
	return uc.repo.UnlockSeat(ctx, seatID)
}

func (uc *flightUseCase) GetFlightSeats(ctx context.Context, flightID string) ([]flight.FlightSeat, error) {
	return uc.repo.GetFlightSeats(ctx, flightID)
}
