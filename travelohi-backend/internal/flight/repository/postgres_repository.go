package repository

import (
	"context"
	"errors"

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
func (r *postgresFlightRepo) SearchFlights(ctx context.Context, origin, dest, date string, limit, offset int32) ([]flight.Flight, int32, error) {
	return nil, 0, nil
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
