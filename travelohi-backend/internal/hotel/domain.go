package hotel

import (
	"context"
	"time"
)

type Hotel struct {
	ID                string
	Name              string
	Description       string
	Address           string
	PictureURLs       []string
	Facilities        []string
	RatingCleanliness float32
	RatingComfort     float32
	RatingLocation    float32
	RatingService     float32
	RatingAverage     float32
	TotalReviews      int32
	StartingPrice     int64

	Rooms []HotelRoom
}

type HotelRoom struct {
	ID             string
	HotelID        string
	Name           string
	PricePerNight  int64
	Capacity       int32
	Facilities     []string
	AvailableCount int32
}

type HotelReview struct {
	ID       string
	HotelID  string
	UserID   string
	UserName string

	RatingCleanliness float32
	RatingComfort     float32
	RatingLocation    float32
	RatingService     float32

	RatingAverage float32
	Comment       string
	CreatedAt     time.Time
}

type HotelRepository interface {
	SearchHotels(ctx context.Context, query string, checkIn string, checkOut string) ([]Hotel, error)

	// get hotel details
}
