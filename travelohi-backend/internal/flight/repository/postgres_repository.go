package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/travelohi/backend/internal/flight"
)

type postgresFlightRepo struct {
	db *gorm.DB
}

func NewPostgresFlightRepository(db *gorm.DB) flight.FlightRepository {
	return &postgresFlightRepo{db: db}
}

// search flights
func (r *postgresFlightRepo) SearchFlights(ctx context.Context, filter flight.FlightSearchFilter) ([]flight.Flight, int32, error) {
	var flights []flight.Flight
	var total int64

	db := r.db.WithContext(ctx).Table("flights")

	origin := filter.Origin
	dest := filter.Destination
	if origin != "" && dest != "" && origin == dest {
		db = db.Where("origin_airport ILIKE ? OR destination_airport ILIKE ?", "%"+origin+"%", "%"+dest+"%")
	} else {
		if origin != "" {
			db = db.Where("origin_airport ILIKE ?", "%"+origin+"%")
		}
		if dest != "" {
			db = db.Where("destination_airport ILIKE ?", "%"+dest+"%")
		}
	}

	if filter.MinPrice > 0 {
		db = db.Where("starting_price >= ?", filter.MinPrice)
	}
	if filter.MaxPrice > 0 {
		db = db.Where("starting_price <= ?", filter.MaxPrice)
	}

	if filter.TransitFilter == "direct" {
		db = db.Where("is_transit = ?", false)
	} else if filter.TransitFilter == "transit" {
		db = db.Where("is_transit = ?", true)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	allowedSorts := map[string]string{
		"duration": "duration_minutes",
		"price":    "starting_price",
		"transits": "is_transit",
	}

	sortCol := "starting_price"
	if mappedCol, exists := allowedSorts[filter.SortBy]; exists {
		sortCol = mappedCol
	}

	sortOrder := "asc"
	if strings.ToLower(filter.SortOrder) == "desc" {
		sortOrder = "desc"
	}

	db = db.Order(fmt.Sprintf("%s %s", sortCol, sortOrder))

	if err := db.Limit(int(filter.Limit)).Offset(int(filter.Offset)).Find(&flights).Error; err != nil {
		return nil, 0, err
	}

	return flights, int32(total), nil
}

func (r *postgresFlightRepo) GetFlightByID(ctx context.Context, id string) (flight.Flight, error) {
	var fl flight.Flight
	err := r.db.WithContext(ctx).Table("flights").Where("id = ?", id).First(&fl).Error
	return fl, err
}

func (r *postgresFlightRepo) GetAirlineByID(ctx context.Context, id string) (flight.Airline, error) {
	var al flight.Airline
	err := r.db.WithContext(ctx).Table("airlines").Where("id = ?", id).First(&al).Error
	return al, err
}

func (r *postgresFlightRepo) LockAndBookSeat(ctx context.Context, seatID string) (int64, error) {
	var lockedPrice int64 = 0

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var seat flight.FlightSeat

		// query and lock
		err := tx.Clauses(clause.Locking{
			Strength: "UPDATE",
			Options:  "NOWAIT",
		}).Where("id = ?", seatID).First(&seat).Error

		if err != nil {
			return err
		}

		// business logic check
		if seat.IsBooked {
			return errors.New("seat is already permanently booked")
		}

		// state mutation
		seat.IsBooked = true
		if err := tx.Save(&seat).Error; err != nil {
			return err
		}

		lockedPrice = seat.Price

		return nil
	})

	return lockedPrice, err
}

func (r *postgresFlightRepo) UnlockSeat(ctx context.Context, seatID string) error {
	return r.db.WithContext(ctx).Model(&flight.FlightSeat{}).
		Where("id = ?", seatID).
		Update("is_booked", false).Error
}

func (r *postgresFlightRepo) GetFlightSeats(ctx context.Context, flightID string) ([]flight.FlightSeat, error) {
	var seats []flight.FlightSeat

	err := r.db.WithContext(ctx).Table("flight_seats").
		Where("flight_id = ?", flightID).
		Find(&seats).Error

	if err != nil {
		return nil, err
	}

	return seats, nil
}
