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

func (h *FlightHandler) SearchFlights(ctx context.Context, req *flightpb.SearchFlightsRequest) (*flightpb.SearchFlightsResponse, error) {
	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := req.Offset
	if offset < 0 {
		offset = 0
	}

	filter := flight.FlightSearchFilter{
		Origin:        req.OriginAirport,
		Destination:   req.DestinationAirport,
		DepartureDate: req.DepartureDate,
		TransitFilter: req.TransitFilter,
		SortBy:        req.SortBy,
		SortOrder:     req.SortOrder,
		Limit:         limit,
		Offset:        offset,
		MinPrice:      req.MinPrice,
		MaxPrice:      req.MaxPrice,
	}

	flights, total, err := h.usecase.SearchFlights(ctx, filter)
	if err != nil {
		return nil, status.Error(codes.Internal, "Failed to search flights: "+err.Error())
	}

	var pbFlights []*flightpb.Flight
	for _, f := range flights {
		var pbAirline *flightpb.Airline
		al, err := h.usecase.GetAirlineByID(ctx, f.AirlineID)
		if err == nil {
			pbAirline = &flightpb.Airline{
				Id:      al.ID,
				Name:    al.Name,
				LogoUrl: al.LogoURL,
			}
		}

		pbFlights = append(pbFlights, &flightpb.Flight{
			Id:                 f.ID,
			Airline:            pbAirline,
			FlightCode:         f.FlightCode,
			OriginAirport:      f.OriginAirport,
			DestinationAirport: f.DestinationAirport,
			DepartureTime:      f.DepartureTime,
			ArrivalTime:        f.ArrivalTime,
			DurationMinutes:    f.DurationMinutes,
			IsTransit:          f.IsTransit,
			StartingPrice:      f.StartingPrice,
		})
	}

	return &flightpb.SearchFlightsResponse{
		Flights:      pbFlights,
		TotalResults: total,
	}, nil
}

func (h *FlightHandler) GetFlightDetails(ctx context.Context, req *flightpb.GetFlightDetailsRequest) (*flightpb.GetFlightDetailsResponse, error) {
	f, err := h.usecase.GetFlightByID(ctx, req.FlightId)
	if err != nil {
		return nil, status.Error(codes.NotFound, "Flight not found: "+err.Error())
	}

	var pbAirline *flightpb.Airline
	al, err := h.usecase.GetAirlineByID(ctx, f.AirlineID)
	if err == nil {
		pbAirline = &flightpb.Airline{
			Id:      al.ID,
			Name:    al.Name,
			LogoUrl: al.LogoURL,
		}
	}

	pbFlight := &flightpb.Flight{
		Id:                 f.ID,
		Airline:            pbAirline,
		FlightCode:         f.FlightCode,
		OriginAirport:      f.OriginAirport,
		DestinationAirport: f.DestinationAirport,
		DepartureTime:      f.DepartureTime,
		ArrivalTime:        f.ArrivalTime,
		DurationMinutes:    f.DurationMinutes,
		IsTransit:          f.IsTransit,
		StartingPrice:      f.StartingPrice,
	}

	seats, err := h.usecase.GetFlightSeats(ctx, f.ID)
	if err != nil {
		return nil, status.Error(codes.Internal, "Failed to get flight seats: "+err.Error())
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

	pbBaggage := []*flightpb.BaggageAddon{
		{Id: "bag-0", FlightId: f.ID, WeightKg: 0, Price: 0},
		{Id: "bag-5", FlightId: f.ID, WeightKg: 5, Price: 150000},
		{Id: "bag-10", FlightId: f.ID, WeightKg: 10, Price: 280000},
		{Id: "bag-20", FlightId: f.ID, WeightKg: 20, Price: 500000},
		{Id: "bag-30", FlightId: f.ID, WeightKg: 30, Price: 750000},
	}

	return &flightpb.GetFlightDetailsResponse{
		Flight:         pbFlight,
		Seats:          pbSeats,
		BaggageOptions: pbBaggage,
	}, nil
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
