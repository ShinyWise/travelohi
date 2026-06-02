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

type Airline struct {
	ID       string
	Name     string
	LogoURL  string
	IATACode string
}

type FlightSearchFilter struct {
	Origin        string
	Destination   string
	DepartureDate string
	TransitFilter string // "direct", "transit", or ""
	SortBy        string // "duration", "price", "transits"
	SortOrder     string // "asc", "desc"
	Limit         int32
	Offset        int32
	MinPrice      int64
	MaxPrice      int64
}

type FlightRepository interface {
	// standard search
	SearchFlights(ctx context.Context, filter FlightSearchFilter) ([]Flight, int32, error)
	GetFlightByID(ctx context.Context, id string) (Flight, error)
	GetAirlineByID(ctx context.Context, id string) (Airline, error)

	// concurrency methods
	LockAndBookSeat(ctx context.Context, seatID string) (int64, error)
	UnlockSeat(ctx context.Context, seatID string) error

	GetFlightSeats(ctx context.Context, flightID string) ([]FlightSeat, error)
}

type FlightUseCase interface {
	SearchFlights(ctx context.Context, filter FlightSearchFilter) ([]Flight, int32, error)
	GetFlightByID(ctx context.Context, id string) (Flight, error)
	GetAirlineByID(ctx context.Context, id string) (Airline, error)
	BookSeat(ctx context.Context, seatID string, userID string) (int64, error)
	UnlockSeat(ctx context.Context, seatID string) error

	GetFlightSeats(ctx context.Context, flightID string) ([]FlightSeat, error)
}
