// internal/flight/delivery/grpc/flight_handler.go
package grpc

import (
	"context"

	"github.com/travelohi/backend/internal/flight"
	"github.com/travelohi/backend/pkg/utils"
	flightpb "github.com/travelohi/backend/proto/flight/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type FlightHandler struct {
	flightpb.UnimplementedFlightServiceServer
	usecase flight.FlightUseCase
}

func NewFlightHandler(usecase flight.FlightUseCase) *FlightHandler {
	return &FlightHandler{usecase: usecase}
}

func (h *FlightHandler) InternalLockSeat(ctx context.Context, req *flightpb.LockSeatRequest) (*flightpb.LockSeatResponse, error) {
	// extract user id
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	// book seat via usecase
	price, err := h.usecase.BookSeat(ctx, req.SeatId, userID)
	if err != nil {
		return nil, err
	}

	return &flightpb.LockSeatResponse{
		Success:     true,
		Message:     "Seat successfully locked",
		LockedPrice: price,
	}, nil
}

func (h *FlightHandler) InternalUnlockSeat(ctx context.Context, req *flightpb.UnlockSeatRequest) (*flightpb.UnlockSeatResponse, error) {
	err := h.usecase.UnlockSeat(ctx, req.SeatId)
	if err != nil {
		return nil, status.Error(codes.Internal, "Failed to unlock seat")
	}

	return &flightpb.UnlockSeatResponse{
		Success: true,
		Message: "Seat successfully unlocked",
	}, nil
}

func (h *FlightHandler) GetFlightSeats(ctx context.Context, req *flightpb.GetFlightSeatsRequest) (*flightpb.GetFlightSeatsResponse, error) {
	seats, err := h.usecase.GetFlightSeats(ctx, req.GetFlightId())
	if err != nil {
		return nil, status.Error(codes.Internal, "Failed to fetch seat map")
	}

	var pbSeats []*flightpb.FlightSeat
	for _, s := range seats {
		pbSeats = append(pbSeats, &flightpb.FlightSeat{
			Id:         s.ID,
			FlightId:   s.FlightID,
			SeatNumber: s.SeatNumber,
			SeatClass:  s.SeatClass,
			Price:      s.Price,
			IsBooked:   s.IsBooked,
		})
	}

	return &flightpb.GetFlightSeatsResponse{Seats: pbSeats}, nil
}
