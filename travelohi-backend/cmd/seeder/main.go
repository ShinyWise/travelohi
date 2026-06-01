package main

import (
	"database/sql/driver"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/brianvoe/gofakeit/v6"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var dummyImageBytes = []byte{
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
	0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21,
	0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
	0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01, 0x44,
	0x00, 0x3b,
}

type ByteaArray [][]byte

// Value implements driver.Valuer
func (a ByteaArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}
	var sb strings.Builder
	sb.WriteString("{")
	for i, b := range a {
		if i > 0 {
			sb.WriteString(",")
		}
		sb.WriteString(`"\\x` + hex.EncodeToString(b) + `"`)
	}
	sb.WriteString("}")
	return sb.String(), nil
}

// Scan implements sql.Scanner
func (a *ByteaArray) Scan(src interface{}) error {
	if src == nil {
		*a = nil
		return nil
	}

	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("unsupported type %T for ByteaArray", src)
	}

	if len(s) < 2 || s[0] != '{' || s[len(s)-1] != '}' {
		return errors.New("invalid bytea[] array syntax")
	}

	s = s[1 : len(s)-1]
	if len(s) == 0 {
		*a = [][]byte{}
		return nil
	}

	var elements [][]byte
	parts := strings.Split(s, ",")
	for _, part := range parts {
		part = strings.Trim(part, ` "`)
		if strings.HasPrefix(part, `\\x`) {
			b, err := hex.DecodeString(part[3:])
			if err != nil {
				return err
			}
			elements = append(elements, b)
		} else if strings.HasPrefix(part, `\x`) {
			b, err := hex.DecodeString(part[2:])
			if err != nil {
				return err
			}
			elements = append(elements, b)
		} else {
			elements = append(elements, []byte(part))
		}
	}
	*a = elements
	return nil
}

// database models matching the gorm schemas

type AuthModel struct {
	ID                 string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	Email              string    `gorm:"unique;not null;column:email;type:varchar(255)"`
	PasswordHash       string    `gorm:"not null;column:password_hash;type:varchar(255)"`
	SecurityQuestionId int       `gorm:"column:security_question_id;type:int"`
	SecurityAnswerHash string    `gorm:"column:security_answer_hash;type:varchar(255)"`
	IsBanned           bool      `gorm:"column:is_banned;default:false"`
	CreatedAt          time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP"`
}

func (AuthModel) TableName() string { return "auths" }

type AccountModel struct {
	ID                   string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	Email                string    `gorm:"unique;not null;column:email;type:varchar(255)"`
	FirstName            string    `gorm:"not null;column:first_name;type:varchar(255)"`
	LastName             string    `gorm:"not null;column:last_name;type:varchar(255)"`
	Gender               string    `gorm:"column:gender;type:varchar(50)"`
	Dob                  string    `gorm:"column:dob;type:varchar(50)"`
	ProfilePicture       []byte    `gorm:"column:profile_picture;type:bytea"`
	IsActive             bool      `gorm:"column:is_active;not null"`
	NewsletterSubscribed bool      `gorm:"column:newsletter_subscribed;default:false"`
	HiWalletBalance      int64     `gorm:"column:hi_wallet_balance;default:0"`
	PhoneNumber          string    `gorm:"column:phone_number;type:varchar(50)"`
	Address              string    `gorm:"column:address;type:text"`
	UpdatedAt            time.Time `gorm:"column:updated_at;default:CURRENT_TIMESTAMP"`
	IsAdmin              bool      `gorm:"column:is_admin;default:false"`
	IsBanned             bool      `gorm:"column:is_banned;default:false"`
}

func (AccountModel) TableName() string { return "account_models" }

// hotel model with json serialized list fields
type HotelModel struct {
	ID                string     `gorm:"primaryKey;column:id"`
	Name              string     `gorm:"column:name"`
	Description       string     `gorm:"column:description"`
	Address           string     `gorm:"column:address"`
	Pictures          ByteaArray `gorm:"column:pictures;type:bytea[]"`
	Facilities        []string   `gorm:"column:facilities;type:jsonb;serializer:json"`
	RatingCleanliness float32    `gorm:"column:rating_cleanliness"`
	RatingComfort     float32    `gorm:"column:rating_comfort"`
	RatingLocation    float32    `gorm:"column:rating_location"`
	RatingService     float32    `gorm:"column:rating_service"`
	RatingAverage     float32    `gorm:"column:rating_average"`
	TotalReviews      int32      `gorm:"column:total_reviews"`
	StartingPrice     int64      `gorm:"column:starting_price"`
}

func (HotelModel) TableName() string { return "hotels" }

// room model
type HotelRoomModel struct {
	ID             string   `gorm:"primaryKey;column:id"`
	HotelID        string   `gorm:"column:hotel_id"`
	Name           string   `gorm:"column:name"`
	PricePerNight  int64    `gorm:"column:price_per_night"`
	Capacity       int32    `gorm:"column:capacity"`
	Facilities     []string `gorm:"column:facilities;type:jsonb;serializer:json"`
	PictureUrl     string   `gorm:"column:picture_url"`
	TotalInventory int32    `gorm:"column:total_inventory;default:5"`
}

func (HotelRoomModel) TableName() string { return "hotel_rooms" }

// review model
type HotelReviewModel struct {
	ID                string    `gorm:"primaryKey;column:id"`
	HotelID           string    `gorm:"column:hotel_id"`
	UserID            string    `gorm:"column:user_id"`
	UserName          string    `gorm:"column:user_name"`
	RatingCleanliness float32   `gorm:"column:rating_cleanliness"`
	RatingComfort     float32   `gorm:"column:rating_comfort"`
	RatingLocation    float32   `gorm:"column:rating_location"`
	RatingService     float32   `gorm:"column:rating_service"`
	RatingAverage     float32   `gorm:"column:rating_average"`
	Comment           string    `gorm:"column:comment"`
	CreatedAt         time.Time `gorm:"column:created_at"`
}

func (HotelReviewModel) TableName() string { return "hotel_reviews" }

type AirlineModel struct {
	ID   string `gorm:"primaryKey;column:id;type:varchar(255)"`
	Name string `gorm:"not null;column:name;type:varchar(255)"`
	Logo []byte `gorm:"column:logo;type:bytea"`
}

func (AirlineModel) TableName() string { return "airlines" }

type FlightModel struct {
	ID                 string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	AirlineID          string    `gorm:"column:airline_id;type:varchar(255)"`
	FlightCode         string    `gorm:"not null;column:flight_code;type:varchar(50)"`
	OriginAirport      string    `gorm:"not null;column:origin_airport;type:varchar(100)"`
	DestinationAirport string    `gorm:"not null;column:destination_airport;type:varchar(100)"`
	DepartureTime      time.Time `gorm:"column:departure_time;type:timestamp"`
	ArrivalTime        time.Time `gorm:"column:arrival_time;type:timestamp"`
	DurationMinutes    int       `gorm:"column:duration_minutes;type:int"`
	IsTransit          bool      `gorm:"column:is_transit;default:false"`
	StartingPrice      int64     `gorm:"column:starting_price"`
}

func (FlightModel) TableName() string { return "flights" }

// flight seat model
type FlightSeatModel struct {
	ID         string `gorm:"primaryKey;column:id;type:varchar(255)"`
	FlightID   string `gorm:"column:flight_id;type:varchar(255)"`
	SeatNumber string `gorm:"column:seat_number;type:varchar(10)"`
	SeatClass  string `gorm:"column:seat_class;type:varchar(50)"`
	Price      int64  `gorm:"column:price"`
	IsBooked   bool   `gorm:"column:is_booked;default:false"`
}

func (FlightSeatModel) TableName() string { return "flight_seats" }

// cart item model
type CartItemModel struct {
	ID            string    `gorm:"primaryKey;column:id;type:varchar(255)"`
	UserID        string    `gorm:"column:user_id;type:varchar(255);not null"`
	ItemType      string    `gorm:"column:item_type;type:varchar(50);not null"`
	ReferenceID   string    `gorm:"column:reference_id;type:varchar(255);not null"`
	Price         int64     `gorm:"column:price;type:bigint;not null"`
	Status        string    `gorm:"column:status;type:varchar(50);default:'in_cart'"`
	Quantity      int32     `gorm:"column:quantity;type:int;default:1"`
	CheckInDate   string    `gorm:"column:check_in_date;type:varchar(50)"`
	CheckOutDate  string    `gorm:"column:check_out_date;type:varchar(50)"`
	LuggageWeight int32     `gorm:"column:luggage_weight;type:int;default:0"`
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (CartItemModel) TableName() string { return "cart_items" }

// helper functions

func hashPassword(plain string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt failed: %v", err)
	}
	return string(hash)
}

func avatarURL(firstName, lastName string) string {
	encoded := url.QueryEscape(fmt.Sprintf("%s %s", firstName, lastName))
	return fmt.Sprintf("https://ui-avatars.com/api/?name=%s&background=random", encoded)
}

func randFloat32(min, max float64) float32 {
	val := min + rand.Float64()*(max-min)
	if val >= 9.99 {
		return 9.99
	}
	// Truncate to 2 decimal places to prevent NUMERIC(3,2) overflow
	return float32(int(val*100)) / 100.0
}

// main entry point

func main() {
	log.Println("🌱 Starting TraveloHI V2 Database Seeder...")

	// connect using fallback local dsn if env is unset
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = "host=localhost user=root password=secretpassword dbname=travelohi_db port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	}

	var db *gorm.DB
	var err error

	// Retry connection if PostgreSQL is not ready yet
	for i := 1; i <= 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			log.Println("✅ Connected to PostgreSQL.")
			break
		}

		log.Printf("⏳ Database not ready yet (Attempt %d/10). Retrying in 3 seconds...", i)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("❌ Fatal: Could not connect to database after 10 attempts: %v", err)
	}
	// ---------------------------------------------------------

	gofakeit.Seed(42) // Fixed seed → reproducible fake data
	rand.Seed(42)     //nolint:staticcheck

	// truncate tables in fk-safe order for idempotency
	log.Println("🗑️  Truncating tables (idempotent run)...")
	tables := []string{
		"cart_items",
		"flight_seats", "flights", "airlines",
		"hotel_reviews", "hotel_rooms", "hotels",
		"account_models", "auths",
	}
	for _, t := range tables {
		if err := db.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", t)).Error; err != nil {
			log.Printf("  WARN: could not truncate %s: %v", t, err)
		}
	}
	log.Println("  Tables cleared.")

	// hash password at runtime
	const plainPassword = "password123"
	hashedPassword := hashPassword(plainPassword)
	log.Printf("🔐 Password '%s' hashed with bcrypt cost %d.", plainPassword, bcrypt.DefaultCost)

	// seed users (49 random + 1 admin)
	log.Println("--- Seeding Users ---")
	// collect seeded users for reference
	var seededUsers []seededUser

	for i := 1; i <= 50; i++ {
		var email, firstName, lastName string
		var isAdmin bool
		var isBanned bool
		var isActive = true

		if i == 50 {
			email = "admin@travelohi.com"
			firstName = "System"
			lastName = "Admin"
			isAdmin = true
		} else if i == 49 {
			email = "banned@travelohi.com"
			firstName = "Banned"
			lastName = "User"
			isBanned = true
		} else if i == 48 {
			email = "inactive@travelohi.com"
			firstName = "Inactive"
			lastName = "User"
			isActive = false
		} else {
			firstName = gofakeit.FirstName()
			lastName = gofakeit.LastName()
			email = strings.ToLower(firstName+"."+lastName) + "@gmail.com"
		}

		userID := uuid.New().String()

		// auth record
		auth := AuthModel{
			ID:                 userID,
			Email:              email,
			PasswordHash:       hashedPassword,
			SecurityQuestionId: gofakeit.Number(1, 5),
			SecurityAnswerHash: hashPassword(gofakeit.Word()),
			IsBanned:           isBanned,
			CreatedAt:          time.Now(),
		}
		if err := db.Create(&auth).Error; err != nil {
			log.Printf("  WARN: auth insert failed for %s: %v", email, err)
			continue
		}

		// profile record
		account := AccountModel{
			ID:                   userID,
			Email:                email,
			FirstName:            firstName,
			LastName:             lastName,
			Gender:               gofakeit.Gender(),
			Dob:                  gofakeit.Date().Format("2006-01-02"),
			ProfilePicture:       nil,
			IsActive:             isActive,
			NewsletterSubscribed: (i == 1 || i == 2), // Limit subscribers for Mailtrap quota limits
			HiWalletBalance:      int64(gofakeit.Number(0, 10_000_000)),
			PhoneNumber:          gofakeit.Phone(),
			Address:              gofakeit.Address().Address,
			UpdatedAt:            time.Now(),
			IsAdmin:              isAdmin,
			IsBanned:             isBanned,
		}
		if err := db.Create(&account).Error; err != nil {
			log.Printf("  WARN: account insert failed for %s: %v", email, err)
			continue
		}

		seededUsers = append(seededUsers, seededUser{id: userID, name: firstName + " " + lastName})

		if isAdmin {
			log.Printf("  👑 [Admin] %s %s (%s) — login with '%s'", firstName, lastName, email, plainPassword)
		} else {
			log.Printf("  [User %d] %s %s (%s)", i, firstName, lastName, email)
		}
	}

	// seed hotels and rooms
	log.Println("--- Seeding Hotels ---")
	// collect hotel ids for reference
	var seededHotels []string
	var seededRooms []HotelRoomModel

	indonesianCities := []string{"Bali", "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan", "Lombok", "Semarang"}
	allFacilities := []string{"Swimming Pool", "WiFi", "Gym", "Restaurant", "Spa", "24-Hour Front Desk", "Elevator", "Parking", "Airport Shuttle"}

	roomTypes := []struct {
		name      string
		basePrice int
		capacity  int32
	}{
		{"Standard Room", 350_000, 2},
		{"Deluxe Room", 600_000, 2},
		{"Superior Room", 850_000, 3},
		{"Junior Suite", 1_200_000, 2},
		{"Executive Suite", 2_000_000, 4},
	}

	for i := 0; i < 20; i++ {
		city := indonesianCities[rand.Intn(len(indonesianCities))]

		// generate randomized pictures
		var pics [][]byte
		for j := 0; j < 4; j++ {
			pics = append(pics, dummyImageBytes)
		}

		// shuffle and select facilities
		rand.Shuffle(len(allFacilities), func(a, b int) { allFacilities[a], allFacilities[b] = allFacilities[b], allFacilities[a] })
		selectedFac := make([]string, rand.Intn(4)+3)
		copy(selectedFac, allFacilities)

		cl := randFloat32(7.0, 9.8)
		co := randFloat32(7.0, 9.8)
		lo := randFloat32(7.0, 9.8)
		sv := randFloat32(7.0, 9.8)
		avg := (cl + co + lo + sv) / 4.0

		hotelID := uuid.New().String()
		hotel := HotelModel{
			ID:                hotelID,
			Name:              fmt.Sprintf("%s %s Hotel", gofakeit.Company(), city),
			Description:       gofakeit.Paragraph(1, 3, 10, " "),
			Address:           fmt.Sprintf("%s, %s, Indonesia", gofakeit.Street(), city),
			Pictures:          ByteaArray(pics),
			Facilities:        selectedFac,
			RatingCleanliness: cl,
			RatingComfort:     co,
			RatingLocation:    lo,
			RatingService:     sv,
			RatingAverage:     avg,
			TotalReviews:      int32(gofakeit.Number(10, 5000)),
			StartingPrice:     int64(gofakeit.Number(300_000, 2_500_000)),
		}

		if err := db.Create(&hotel).Error; err != nil {
			log.Printf("  WARN: hotel insert failed for %s: %v", hotel.Name, err)
			continue
		}

		// seed room types per hotel
		numRooms := rand.Intn(3) + 3
		for r := 0; r < numRooms; r++ {
			rt := roomTypes[r%len(roomTypes)]
			priceVariance := int64(gofakeit.Number(-50_000, 200_000))

			rand.Shuffle(len(allFacilities), func(a, b int) { allFacilities[a], allFacilities[b] = allFacilities[b], allFacilities[a] })
			roomFac := make([]string, 3)
			copy(roomFac, allFacilities)

			roomId := uuid.New().String()
			room := HotelRoomModel{
				ID:             roomId,
				HotelID:        hotelID,
				Name:           rt.name,
				PricePerNight:  int64(rt.basePrice) + priceVariance,
				Capacity:       rt.capacity,
				Facilities:     roomFac,
				PictureUrl:     fmt.Sprintf("https://picsum.photos/seed/%s/800/600", roomId),
				TotalInventory: int32(gofakeit.Number(3, 10)),
			}
			if err := db.Create(&room).Error; err != nil {
				log.Printf("  WARN: room insert failed: %v", err)
			}
			seededRooms = append(seededRooms, room)
		}

		seededHotels = append(seededHotels, hotelID)
		log.Printf("  [Hotel] %s in %s — %d room types seeded", hotel.Name, city, numRooms)
	}

	// seed airlines
	log.Println("--- Seeding Airlines ---")

	airlineDefs := []struct{ name, code string }{
		{"Garuda Indonesia", "GA"},
		{"Citilink", "QG"},
		{"Batik Air", "ID"},
		{"Lion Air", "JT"},
		{"AirAsia Indonesia", "QZ"},
	}

	seededAirlines := make([]AirlineModel, 0, len(airlineDefs))
	for _, a := range airlineDefs {
		airline := AirlineModel{
			ID:   uuid.New().String(),
			Name: a.name,
			Logo: dummyImageBytes,
		}
		if err := db.Create(&airline).Error; err != nil {
			log.Printf("  WARN: airline insert failed for %s: %v", a.name, err)
			continue
		}
		seededAirlines = append(seededAirlines, airline)
		log.Printf("  [Airline] %s (%s)", a.name, airline.ID)
	}

	if len(seededAirlines) == 0 {
		log.Fatal("❌ No airlines seeded — cannot seed flights. Aborting.")
	}

	// seed flights and seats
	log.Println("--- Seeding Flights ---")
	var seededSeats []FlightSeatModel

	airports := []string{"CGK", "DPS", "BDO", "SUB", "YIA", "KNO", "LOP", "UPG", "PLM"}

	seatClasses := []struct {
		class      string
		priceExtra int64
	}{
		{"Economy", 0},
		{"Business", 1_500_000},
	}

	for i := 1; i <= 50; i++ {
		airline := seededAirlines[rand.Intn(len(seededAirlines))]

		origin := airports[rand.Intn(len(airports))]
		dest := airports[rand.Intn(len(airports))]
		for dest == origin {
			dest = airports[rand.Intn(len(airports))]
		}

		depTime := gofakeit.DateRange(time.Now().Add(24*time.Hour), time.Now().AddDate(0, 3, 0))
		durationMin := gofakeit.Number(60, 300)
		arrTime := depTime.Add(time.Duration(durationMin) * time.Minute)

		// resolve the two letter iata code
		iataCode := "XX"
		for _, a := range airlineDefs {
			if a.name == airline.Name {
				iataCode = a.code
				break
			}
		}

		flightID := uuid.New().String()
		flightCode := fmt.Sprintf("%s%d", iataCode, gofakeit.Number(100, 999))

		basePrice := int64(gofakeit.Number(500_000, 3_000_000))

		fl := FlightModel{
			ID:                 flightID,
			AirlineID:          airline.ID,
			FlightCode:         flightCode,
			OriginAirport:      origin,
			DestinationAirport: dest,
			DepartureTime:      depTime,
			ArrivalTime:        arrTime,
			DurationMinutes:    durationMin,
			IsTransit:          gofakeit.Bool(),
			StartingPrice:      basePrice,
		}

		if err := db.Create(&fl).Error; err != nil {
			log.Printf("  WARN: flight insert failed %s: %v", flightCode, err)
			continue
		}

		// seed seats for each flight
		seatRows := map[string]struct {
			rows    int
			letters []string
		}{
			"Economy":  {20, []string{"A", "B", "C", "D", "E", "F"}},
			"Business": {4, []string{"A", "B", "C", "D"}},
		}

		seatCount := 0
		for _, sc := range seatClasses {
			cfg := seatRows[sc.class]
			for row := 1; row <= cfg.rows; row++ {
				for _, letter := range cfg.letters {
					seatPrice := basePrice + sc.priceExtra
					// add minor price variance
					seatPrice += int64(gofakeit.Number(-50_000, 100_000))

					seat := FlightSeatModel{
						ID:         uuid.New().String(),
						FlightID:   flightID,
						SeatNumber: fmt.Sprintf("%d%s", row, letter),
						SeatClass:  sc.class,
						Price:      seatPrice,
						IsBooked:   false,
					}
					if err := db.Create(&seat).Error; err != nil {
						log.Printf("  WARN: seat insert failed: %v", err)
					}
					seededSeats = append(seededSeats, seat)
					seatCount++
				}
			}
		}

		log.Printf("  [Flight] %s | %s → %s | %d min | %d seats", flightCode, origin, dest, durationMin, seatCount)
	}

	// seed hotel reviews and cart bookings
	seedReviews(db, seededUsers, seededHotels)
	seedCartItems(db, seededUsers, seededRooms, seededSeats)

	log.Println("")
	log.Println("✅ Seeding completed successfully!")
	log.Printf("   Admin login  : admin@travelohi.com / %s", plainPassword)
	log.Printf("   Random users : password = '%s'", plainPassword)
}

// seedReviews creates random reviews and aggregates rating statistics
type seededUser struct{ id, name string }

func seedReviews(db *gorm.DB, users []seededUser, hotelIDs []string) {
	if len(users) == 0 || len(hotelIDs) == 0 {
		log.Println("  WARN: no users or hotels to review — skipping reviews.")
		return
	}
	log.Println("--- Seeding Hotel Reviews ---")

	totalReviews := 0
	for _, hotelID := range hotelIDs {
		numReviews := rand.Intn(11) + 5 // 5–15

		var sumCl, sumCo, sumLo, sumSv float32

		for r := 0; r < numReviews; r++ {
			reviewer := users[rand.Intn(len(users))]

			// ratings on a 1-10 scale
			cl := randFloat32(5.0, 10.0)
			co := randFloat32(5.0, 10.0)
			lo := randFloat32(5.0, 10.0)
			sv := randFloat32(5.0, 10.0)
			avg := (cl + co + lo + sv) / 4.0

			sumCl += cl
			sumCo += co
			sumLo += lo
			sumSv += sv

			// spread reviews over the past 2 years
			daysAgo := rand.Intn(730)
			rev := HotelReviewModel{
				ID:                uuid.New().String(),
				HotelID:           hotelID,
				UserID:            reviewer.id,
				UserName:          reviewer.name,
				RatingCleanliness: cl,
				RatingComfort:     co,
				RatingLocation:    lo,
				RatingService:     sv,
				RatingAverage:     avg,
				Comment:           gofakeit.Paragraph(1, 3, rand.Intn(10)+5, " "),
				CreatedAt:         time.Now().AddDate(0, 0, -daysAgo),
			}
			if err := db.Create(&rev).Error; err != nil {
				log.Printf("  WARN: review insert failed: %v", err)
			}
		}

		// aggregate and update ratings
		n := float32(numReviews)
		db.Table("hotels").Where("id = ?", hotelID).Updates(map[string]interface{}{
			"rating_cleanliness": sumCl / n,
			"rating_comfort":     sumCo / n,
			"rating_location":    sumLo / n,
			"rating_service":     sumSv / n,
			"rating_average":     (sumCl + sumCo + sumLo + sumSv) / (4 * n),
			"total_reviews":      numReviews,
		})

		totalReviews += numReviews
		log.Printf("  [Reviews] Hotel %s — %d reviews seeded", hotelID[:8], numReviews)
	}
	log.Printf("  Total: %d reviews across %d hotels.", totalReviews, len(hotelIDs))
}

// seedCartItems populates historical bookings for telemetry
func seedCartItems(db *gorm.DB, users []seededUser, rooms []HotelRoomModel, seats []FlightSeatModel) {
	if len(users) == 0 {
		return
	}
	log.Println("--- Seeding Historical Cart Bookings (for Telemetry) ---")

	totalPaid := 0

	// seed hotel bookings
	if len(rooms) > 0 {
		for i := 0; i < 150; i++ {
			u := users[rand.Intn(len(users))]
			r := rooms[rand.Intn(len(rooms))]
			daysAgo := rand.Intn(30)
			checkIn := time.Now().AddDate(0, 0, -daysAgo)
			checkOut := checkIn.AddDate(0, 0, rand.Intn(5)+1)

			item := CartItemModel{
				ID:           uuid.New().String(),
				UserID:       u.id,
				ItemType:     "hotel_room",
				ReferenceID:  r.ID,
				Price:        r.PricePerNight,
				Status:       "paid",
				Quantity:     1,
				CheckInDate:  checkIn.Format("2006-01-02"),
				CheckOutDate: checkOut.Format("2006-01-02"),
				CreatedAt:    checkIn.Add(-24 * time.Hour),
			}
			if err := db.Create(&item).Error; err == nil {
				totalPaid++
			}
		}
	}

	// seed flight bookings
	if len(seats) > 0 {
		for i := 0; i < 150; i++ {
			u := users[rand.Intn(len(users))]
			s := seats[rand.Intn(len(seats))]
			daysAgo := rand.Intn(30)

			item := CartItemModel{
				ID:          uuid.New().String(),
				UserID:      u.id,
				ItemType:    "flight_seat",
				ReferenceID: s.ID,
				Price:       s.Price,
				Status:      "paid",
				Quantity:    1,
				CreatedAt:   time.Now().AddDate(0, 0, -daysAgo),
			}
			if err := db.Create(&item).Error; err == nil {
				totalPaid++
			}
		}
	}

	log.Printf("  Total: %d 'paid' cart_items seeded for recommendations.", totalPaid)

	log.Println("🧹 Flushing Memcached...")
	memcachedUrl := os.Getenv("MEMCACHED_URL")
	if memcachedUrl == "" {
		memcachedUrl = "localhost:11211"
	}
	mc := memcache.New(memcachedUrl)
	if err := mc.FlushAll(); err != nil {
		log.Printf("  WARN: Failed to flush memcached: %v", err)
	} else {
		log.Println("  Memcached flushed successfully.")
	}
}
