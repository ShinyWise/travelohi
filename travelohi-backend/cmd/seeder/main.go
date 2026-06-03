package main

import (
	"database/sql/driver"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/rand"
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

type HotelRoomModel struct {
	ID             string   `gorm:"primaryKey;column:id"`
	HotelID        string   `gorm:"column:hotel_id"`
	Name           string   `gorm:"column:name"`
	PricePerNight  int64    `gorm:"column:price_per_night"`
	Capacity       int32    `gorm:"column:capacity"`
	Facilities     []string `gorm:"column:facilities;type:jsonb;serializer:json"`
	Picture        []byte   `gorm:"column:picture;type:bytea"`
	TotalInventory int32    `gorm:"column:total_inventory;default:5"`
}

func (HotelRoomModel) TableName() string { return "hotel_rooms" }

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

type FlightSeatModel struct {
	ID         string `gorm:"primaryKey;column:id;type:varchar(255)"`
	FlightID   string `gorm:"column:flight_id;type:varchar(255)"`
	SeatNumber string `gorm:"column:seat_number;type:varchar(10)"`
	SeatClass  string `gorm:"column:seat_class;type:varchar(50)"`
	Price      int64  `gorm:"column:price"`
	IsBooked   bool   `gorm:"column:is_booked;default:false"`
}

func (FlightSeatModel) TableName() string { return "flight_seats" }

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

type BookingModel struct {
	ID                   string    `gorm:"primaryKey;column:id"`
	UserID               string    `gorm:"column:user_id"`
	TransactionID        string    `gorm:"column:transaction_id"`
	ItemType             string    `gorm:"column:item_type"`
	DisplayName          string    `gorm:"column:display_name"`
	CheckInDate          string    `gorm:"column:check_in_date"`
	CheckOutDate         string    `gorm:"column:check_out_date"`
	Status               string    `gorm:"column:status"`
	BookingReferenceCode string    `gorm:"column:booking_reference_code"`
	RoomID               string    `gorm:"column:room_id"`
	CreatedAt            time.Time `gorm:"column:created_at"`
}

func (BookingModel) TableName() string { return "booking_models" }

var baseTime = time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

func deterministicUUID(ns string, id interface{}) string {
	return uuid.NewSHA1(uuid.NameSpaceDNS, []byte(fmt.Sprintf("%s-%v", ns, id))).String()
}

// helper functions
func hashPassword(plain string) string {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt failed: %v", err)
	}
	return string(hash)
}

func randFloat32(min, max float64) float32 {
	val := min + rand.Float64()*(max-min)
	if val >= 9.99 {
		return 9.99
	}
	return float32(int(val*100)) / 100.0
}

// main entry point
func main() {
	log.Println("Starting TraveloHI V3 Database Seeder...")
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = "host=localhost user=root password=secretpassword dbname=travelohi_db port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	}

	var db *gorm.DB
	var err error

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

	gofakeit.Seed(42)
	rand.Seed(42)
	log.Println("🗑️  Truncating tables (idempotent run)...")
	tables := []string{
		"cart_items", "booking_models",
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
	hashedSecurityAnswer := hashPassword("securityanswer")
	log.Printf("Password '%s' hashed with bcrypt cost %d.", plainPassword, bcrypt.DefaultCost)

	log.Println("--- Seeding Users ---")
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
			email = "test@travelohi.com"
			firstName = "Test"
			lastName = "User"
		} else if i == 48 {
			email = "banned@travelohi.com"
			firstName = "Banned"
			lastName = "User"
			isBanned = true
		} else if i == 47 {
			email = "inactive@travelohi.com"
			firstName = "Inactive"
			lastName = "User"
			isActive = false
		} else {
			firstName = gofakeit.FirstName()
			lastName = gofakeit.LastName()
			email = strings.ToLower(firstName+"."+lastName) + "@gmail.com"
		}

		userID := deterministicUUID("user", i)

		// auth record
		auth := AuthModel{
			ID:                 userID,
			Email:              email,
			PasswordHash:       hashedPassword,
			SecurityQuestionId: gofakeit.Number(1, 5),
			SecurityAnswerHash: hashedSecurityAnswer,
			IsBanned:           isBanned,
			CreatedAt:          baseTime,
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
			UpdatedAt:            baseTime,
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

	log.Println("--- Seeding Hotels ---")
	var seededHotels []string
	var seededRooms []HotelRoomModel

	indonesianCities := []string{"Bali", "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan", "Lombok", "Semarang"}
	allFacilities := []string{"Swimming Pool", "WiFi", "Gym", "Restaurant", "Spa", "24-Hour Front Desk", "Elevator", "Parking", "Airport Shuttle"}

	roomTypes := []struct {
		name      string
		basePrice int
		capacity  int32
		assetName string
	}{
		{"Standard Room", 350_000, 2, "standard.jpg"},
		{"Deluxe Room", 600_000, 2, "deluxe.jpg"},
		{"Executive Suite", 1_500_000, 4, "executive.jpg"},
	}

	log.Println("Reading real image assets from cmd/seeder/assets...")
	loadAsset := func(name string) []byte {
		b, err := os.ReadFile("cmd/seeder/assets/" + name)
		if err != nil {
			log.Printf("  WARN: could not read %s, using dummy pixel", name)
			return dummyImageBytes
		}
		return b
	}

	var allHotelImages [][]byte
	if files, err := os.ReadDir("cmd/seeder/assets"); err == nil {
		for _, f := range files {
			if strings.HasPrefix(f.Name(), "hotel_") && (strings.HasSuffix(f.Name(), ".jpg") || strings.HasSuffix(f.Name(), ".jpeg")) {
				if b, readErr := os.ReadFile("cmd/seeder/assets/" + f.Name()); readErr == nil {
					allHotelImages = append(allHotelImages, b)
				}
			}
		}
	}
	if len(allHotelImages) == 0 {
		allHotelImages = append(allHotelImages, dummyImageBytes)
	}

	assetMap := map[string][]byte{
		"standard.jpg":  loadAsset("standard.jpg"),
		"deluxe.jpg":    loadAsset("deluxe.jpg"),
		"executive.jpg": loadAsset("executive.jpg"),
		"ga.png":        loadAsset("ga.png"),
		"qg.png":        loadAsset("qg.png"),
		"id.png":        loadAsset("id.png"),
		"jt.png":        loadAsset("jt.png"),
		"qz.png":        loadAsset("qz.png"),
	}

	for i := 0; i < 20; i++ {
		city := indonesianCities[rand.Intn(len(indonesianCities))]
		hotelName := fmt.Sprintf("%s %s Hotel", gofakeit.Company(), city)
		var pics [][]byte
		if len(allHotelImages) >= 4 {
			randIndexes := rand.Perm(len(allHotelImages))[:4]
			pics = append(pics, allHotelImages[randIndexes[0]], allHotelImages[randIndexes[1]], allHotelImages[randIndexes[2]], allHotelImages[randIndexes[3]])
		} else {
			for j := 0; j < 4; j++ {
				pics = append(pics, allHotelImages[j%len(allHotelImages)])
			}
		}

		rand.Shuffle(len(allFacilities), func(a, b int) { allFacilities[a], allFacilities[b] = allFacilities[b], allFacilities[a] })
		selectedFac := make([]string, rand.Intn(4)+3)
		copy(selectedFac, allFacilities)

		cl := randFloat32(7.0, 9.8)
		co := randFloat32(7.0, 9.8)
		lo := randFloat32(7.0, 9.8)
		sv := randFloat32(7.0, 9.8)
		avg := (cl + co + lo + sv) / 4.0

		hotelID := deterministicUUID("hotel", i)
		hotel := HotelModel{
			ID:                hotelID,
			Name:              hotelName,
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

		for rtIdx, rt := range roomTypes {
			priceVariance := int64(gofakeit.Number(-50_000, 200_000))

			rand.Shuffle(len(allFacilities), func(a, b int) { allFacilities[a], allFacilities[b] = allFacilities[b], allFacilities[a] })
			roomFac := make([]string, 3)
			copy(roomFac, allFacilities)

			roomId := deterministicUUID("room", i*10+rtIdx)
			room := HotelRoomModel{
				ID:             roomId,
				HotelID:        hotelID,
				Name:           rt.name,
				PricePerNight:  int64(rt.basePrice) + priceVariance,
				Capacity:       rt.capacity,
				Facilities:     roomFac,
				Picture:        assetMap[rt.assetName],
				TotalInventory: int32(gofakeit.Number(3, 10)),
			}
			if err := db.Create(&room).Error; err != nil {
				log.Printf("  WARN: room insert failed: %v", err)
			}
			seededRooms = append(seededRooms, room)
		}

		seededHotels = append(seededHotels, hotelID)
		log.Printf("  [Hotel] %s in %s — %d room types seeded", hotel.Name, city, len(roomTypes))
	}

	// seed airlines
	log.Println("--- Seeding Airlines ---")

	airlineDefs := []struct{ name, code, asset string }{
		{"Garuda Indonesia", "GA", "ga.png"},
		{"Citilink", "QG", "qg.png"},
		{"Batik Air", "ID", "id.png"},
		{"Lion Air", "JT", "jt.png"},
		{"AirAsia Indonesia", "QZ", "qz.png"},
	}

	seededAirlines := make([]AirlineModel, 0, len(airlineDefs))
	for aIdx, a := range airlineDefs {
		airline := AirlineModel{
			ID:   deterministicUUID("airline", aIdx),
			Name: a.name,
			Logo: assetMap[a.asset],
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
		{"Business", 1_500_000},
		{"Economy", 0},
	}

	for i := 1; i <= 50; i++ {
		airline := seededAirlines[rand.Intn(len(seededAirlines))]

		origin := airports[rand.Intn(len(airports))]
		dest := airports[rand.Intn(len(airports))]
		for dest == origin {
			dest = airports[rand.Intn(len(airports))]
		}

		depTime := gofakeit.DateRange(baseTime.Add(24*time.Hour), baseTime.AddDate(0, 3, 0))
		durationMin := gofakeit.Number(60, 300)
		arrTime := depTime.Add(time.Duration(durationMin) * time.Minute)

		iataCode := "XX"
		for _, a := range airlineDefs {
			if a.name == airline.Name {
				iataCode = a.code
				break
			}
		}

		flightID := deterministicUUID("flight", i)
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

		seatRows := map[string]struct {
			rows    int
			letters []string
		}{
			"Business": {4, []string{"A", "F"}},
			"Economy":  {20, []string{"A", "B", "C", "D", "E", "F"}},
		}

		seatCount := 0
		currentRow := 1
		for _, sc := range seatClasses {
			cfg := seatRows[sc.class]
			for rowOffset := 0; rowOffset < cfg.rows; rowOffset++ {
				actualRow := currentRow + rowOffset
				for _, letter := range cfg.letters {
					seatPrice := basePrice + sc.priceExtra
					seatPrice += int64(gofakeit.Number(-50_000, 100_000))

					seat := FlightSeatModel{
						ID:         deterministicUUID(fmt.Sprintf("seat-%s", flightID), seatCount),
						FlightID:   flightID,
						SeatNumber: fmt.Sprintf("%d%s", actualRow, letter),
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
			currentRow += cfg.rows
		}

		log.Printf("  [Flight] %s | %s → %s | %d min | %d seats", flightCode, origin, dest, durationMin, seatCount)
	}

	seedReviews(db, seededUsers, seededHotels)
	seedCartItems(db, seededUsers, seededRooms, seededSeats)

	var adminUser seededUser
	for _, u := range seededUsers {
		if u.name == "System Admin" {
			adminUser = u
			break
		}
	}
	if adminUser.id == "" {
		var a AccountModel
		db.Where("email = ?", "admin@travelohi.com").First(&a)
		adminUser = seededUser{id: a.ID, name: a.FirstName + " " + a.LastName}
	}

	if adminUser.id != "" && len(seededRooms) > 0 {
		r := seededRooms[0]
		var h HotelModel
		db.Where("id = ?", r.HotelID).First(&h)
		b := BookingModel{
			ID:                   "TEST-REVIEW-ADMIN",
			UserID:               adminUser.id,
			TransactionID:        "TX-ADMIN-INITIAL",
			ItemType:             "hotel_room",
			DisplayName:          fmt.Sprintf("%s | %s", h.Name, r.Name),
			CheckInDate:          "2026-05-01",
			CheckOutDate:         "2026-05-05",
			Status:               "completed",
			BookingReferenceCode: "REV-ADMIN",
			RoomID:               r.ID,
			CreatedAt:            baseTime.AddDate(0, -1, 0),
		}
		db.Create(&b)
		log.Printf("  ✅ Admin history seeded for %s", adminUser.name)
	}

	log.Println("")
	log.Println("✅ Seeding completed successfully!")
	log.Printf("   Admin login  : admin@travelohi.com / %s", plainPassword)
	log.Printf("   Random users : password = '%s'", plainPassword)
}

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
				ID:                deterministicUUID(fmt.Sprintf("review-%s", hotelID), r),
				HotelID:           hotelID,
				UserID:            reviewer.id,
				UserName:          reviewer.name,
				RatingCleanliness: cl,
				RatingComfort:     co,
				RatingLocation:    lo,
				RatingService:     sv,
				RatingAverage:     avg,
				Comment:           gofakeit.Paragraph(1, 3, rand.Intn(10)+5, " "),
				CreatedAt:         baseTime.AddDate(0, 0, -daysAgo),
			}
			if err := db.Create(&rev).Error; err != nil {
				log.Printf("  WARN: review insert failed: %v", err)
			}
		}
		// update ratings telemetry
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
			checkIn := baseTime.AddDate(0, 0, -daysAgo)
			checkOut := checkIn.AddDate(0, 0, rand.Intn(5)+1)

			item := CartItemModel{
				ID:           deterministicUUID("cart-hotel", i),
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
				ID:          deterministicUUID("cart-flight", i),
				UserID:      u.id,
				ItemType:    "flight_seat",
				ReferenceID: s.ID,
				Price:       s.Price,
				Status:      "paid",
				Quantity:    1,
				CreatedAt:   baseTime.AddDate(0, 0, -daysAgo),
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
