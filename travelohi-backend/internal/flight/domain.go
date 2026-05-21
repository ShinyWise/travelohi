package flight

import "context"

type Flight struct {
	ID                 string
	AirlineID          string
	FlightCode         string
	OriginAirport      string
	DestinationAirport string
	DepartureTime      string
	ArrivalTime        string
	DurationMinutes    int32
	IsTransit          bool
	StartingPrice      int64
}

type FlightSeat struct {
	ID         string
	FlightID   string
	SeatNumber string
	SeatClass  string
	Price      int64
	IsBooked   bool
}

type FlightRepository interface {
	// standard search
	SearchFlights(ctx context.Context, origin, dest, date string, limit, offset int32) ([]Flight, int32, error)

	// concurrency methods
	LockAndBookSeat(ctx context.Context, seatID string) (int64, error)
	UnlockSeat(ctx context.Context, seatID string) error

	GetFlightSeats(ctx context.Context, flightID string) ([]FlightSeat, error)
}

type FlightUseCase interface {
	SearchFlights(ctx context.Context, origin, dest, date string, limit, offset int32) ([]Flight, int32, error)
	BookSeat(ctx context.Context, seatID string, userID string) (int64, error)
	UnlockSeat(ctx context.Context, seatID string) error

	GetFlightSeats(ctx context.Context, flightID string) ([]FlightSeat, error)
}
