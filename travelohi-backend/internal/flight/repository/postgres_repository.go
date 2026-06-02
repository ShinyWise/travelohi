package repository

import (
	"context"
	"encoding/base64"
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

	db := r.db.WithContext(ctx).Table("flights").
		Joins("JOIN airlines ON flights.airline_id = airlines.id")

	origin := filter.Origin
	dest := filter.Destination
	if origin != "" && dest != "" && origin == dest {
		db = db.Where("flights.origin_airport ILIKE ? OR flights.destination_airport ILIKE ? OR airlines.name ILIKE ?", "%"+origin+"%", "%"+dest+"%", "%"+origin+"%")
	} else {
		if origin != "" {
			db = db.Where("flights.origin_airport ILIKE ? OR airlines.name ILIKE ?", "%"+origin+"%", "%"+origin+"%")
		}
		if dest != "" {
			db = db.Where("flights.destination_airport ILIKE ? OR airlines.name ILIKE ?", "%"+dest+"%", "%"+dest+"%")
		}
	}

	if filter.MinPrice > 0 {
		db = db.Where("flights.starting_price >= ?", filter.MinPrice)
	}
	if filter.MaxPrice > 0 {
		db = db.Where("flights.starting_price <= ?", filter.MaxPrice)
	}

	if filter.TransitFilter == "direct" {
		db = db.Where("flights.is_transit = ?", false)
	} else if filter.TransitFilter == "transit" {
		db = db.Where("flights.is_transit = ?", true)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	allowedSorts := map[string]string{
		"duration": "flights.duration_minutes",
		"price":    "flights.starting_price",
		"transits": "flights.is_transit",
	}

	sortCol := "flights.starting_price"
	if mappedCol, exists := allowedSorts[filter.SortBy]; exists {
		sortCol = mappedCol
	}

	sortOrder := "asc"
	if strings.ToLower(filter.SortOrder) == "desc" {
		sortOrder = "desc"
	}

	db = db.Order(fmt.Sprintf("%s %s", sortCol, sortOrder))

	if err := db.Select("flights.*").Limit(int(filter.Limit)).Offset(int(filter.Offset)).Find(&flights).Error; err != nil {
		return nil, 0, err
	}

	return flights, int32(total), nil
}

func (r *postgresFlightRepo) GetFlightByID(ctx context.Context, id string) (flight.Flight, error) {
	var fl flight.Flight
	err := r.db.WithContext(ctx).Table("flights").Where("id = ?", id).First(&fl).Error
	return fl, err
}

type AirlineModel struct {
	ID       string `gorm:"primaryKey"`
	Name     string
	IATACode string `gorm:"column:iata_code"`
	Logo     []byte `gorm:"column:logo;type:bytea"`
}

func (AirlineModel) TableName() string { return "airlines" }

func (r *postgresFlightRepo) GetAirlineByID(ctx context.Context, id string) (flight.Airline, error) {
	var m AirlineModel
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error; err != nil {
		return flight.Airline{}, err
	}
	logoURL := ""
	if len(m.Logo) > 0 {
		logoURL = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(m.Logo)
	}
	return flight.Airline{
		ID:       m.ID,
		Name:     m.Name,
		LogoURL:  logoURL,
		IATACode: m.IATACode,
	}, nil
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
