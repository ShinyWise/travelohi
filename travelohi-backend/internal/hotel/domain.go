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
	Availability      int32

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
	ImageURL       string
}

type SearchFilter struct {
	Query      string
	CheckIn    string
	CheckOut   string
	SortBy     string
	SortOrder  string
	Limit      int32
	Offset     int32
	MinPrice   int64
	MaxPrice   int64
	MinRating  float32
	Facilities []string
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
	SearchHotels(ctx context.Context, filter SearchFilter) ([]Hotel, int32, error)
	GetHotelByID(ctx context.Context, id string) (Hotel, error)
	GetAvailableRooms(ctx context.Context, hotelID string, checkIn, checkOut string) ([]HotelRoom, error)
	GetRecentReviews(ctx context.Context, hotelID string) ([]HotelReview, error)
	AddHotelReview(ctx context.Context, review HotelReview) error
}

type HotelUseCase interface {
	SearchHotels(ctx context.Context, filter SearchFilter) ([]Hotel, int32, error)
	GetHotelDetails(ctx context.Context, hotelID string, checkIn, checkOut string) (Hotel, []HotelRoom, []HotelReview, error)
	AddHotelReview(ctx context.Context, review HotelReview) error
}
