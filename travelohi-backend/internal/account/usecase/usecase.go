package usecase

// usecase -> buat business logic and database handoff
import (
	"context"
	"errors"
	"strings"

	"github.com/travelohi/backend/internal/account"
)

type AccountUseCase struct {
	repo        account.AccountRepository
	bookingRepo account.BookingRepository
}

func NewAccountUseCase(repo account.AccountRepository, bookingRepo account.BookingRepository) account.AccountUseCase {
	return &AccountUseCase{
		repo:        repo,
		bookingRepo: bookingRepo,
	}
}

// diganti dari create jadi init karena udh dibikin di authService, we use microservice handshake
func (uc *AccountUseCase) InitProfile(ctx context.Context, account *account.Account) error {
	if account.ID == "" || account.Email == "" {
		return errors.New("[ERROR] Cannot initialize profile: ID and Email are required")
	}

	// initial balance
	account.HiWalletBalance = 5000000
	account.IsActive = true

	return uc.repo.Create(ctx, account)
}

func (uc *AccountUseCase) GetProfile(ctx context.Context, id string) (*account.Account, error) {
	// ambil raw data dari repo dlu sesuai id yang dicari
	acc, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		return nil, errors.New("Account not found")
	}
	return acc, nil
}

func (uc *AccountUseCase) UpdateProfile(ctx context.Context, u *account.Account) (*account.Account, error) {
	if u.ID == "" {
		return nil, errors.New("[ERROR] Cannot update profile: User ID is required")
	}

	err := uc.repo.Update(ctx, u)
	if err != nil {
		return nil, err
	}

	return uc.repo.GetByID(ctx, u.ID)
}

func (uc *AccountUseCase) DeductWallet(ctx context.Context, userID string, amount int64) error {
	if amount <= 0 {
		return errors.New("deduction amount must be greater than zero")
	}

	// handle error insufficient funds
	return uc.repo.DeductBalance(ctx, userID, amount)
}

func (uc *AccountUseCase) RefundWallet(ctx context.Context, userID string, amount int64) error {
	if amount <= 0 {
		return errors.New("refund amount must be greater than zero")
	}

	return uc.repo.AddBalance(ctx, userID, amount)
}

func (uc *AccountUseCase) InternalCreateBooking(ctx context.Context, booking *account.Booking) (*account.Booking, error) {
	// extract room id if hotel room
	if booking.ItemType == "hotel_room" {
		parts := strings.Split(booking.DisplayName, "|")
		if len(parts) > 1 {
			booking.DisplayName = parts[0]
			booking.RoomID = parts[1]
		}

		if booking.RoomID != "" {
			// fetch total inventory limit
			inventory, err := uc.bookingRepo.GetRoomInventory(ctx, booking.RoomID)
			if err != nil {
				return nil, err
			}

			// Count existing overlapping bookings, yang aktif aj
			count, err := uc.bookingRepo.GetOverlappingBookingsCount(ctx, booking.RoomID, booking.CheckInDate, booking.CheckOutDate)
			if err != nil {
				return nil, err
			}

			// Validate quota
			if int(count) >= inventory {
				return nil, errors.New("kamar penuh untuk tanggal yang dipilih")
			}
		}
	}

	// generate booking reference code
	booking.BookingReferenceCode = "PNR-" + booking.ID[:8]
	booking.Status = "completed"

	err := uc.bookingRepo.CreateBooking(ctx, booking)
	if err != nil {
		return nil, err
	}

	// Also insert into bookings table for hotel service integration if it's a hotel room
	if booking.ItemType == "hotel_room" && booking.RoomID != "" {
		err = uc.bookingRepo.CreateRawBooking(ctx, booking.ID, booking.RoomID, booking.UserID, booking.CheckInDate, booking.CheckOutDate, "ongoing")
		if err != nil {
			return nil, err
		}
	}

	return booking, nil
}

func (uc *AccountUseCase) GetBookingHistory(ctx context.Context, userID string, filterStatus string, limit, offset int32) ([]account.Booking, int32, error) {
	bookings, total, err := uc.bookingRepo.GetBookingHistory(ctx, userID, filterStatus, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	return bookings, int32(total), nil
}

func (uc *AccountUseCase) GetETicket(ctx context.Context, userID, bookingID string) (*account.Booking, string, string, string, error) {
	booking, err := uc.bookingRepo.GetBookingByID(ctx, bookingID)
	if err != nil {
		return nil, "", "", "", errors.New("booking not found")
	}

	if booking.UserID != userID {
		return nil, "", "", "", errors.New("unauthorized access to booking")
	}

	// dummy e-ticket data
	qrCodeData := "QR-" + booking.BookingReferenceCode
	issueDate := booking.CreatedAt.Format("2006-01-02 15:04:05")
	passengerName := "Placeholder Name"

	userProfile, err := uc.repo.GetByID(ctx, userID)
	if err == nil && userProfile != nil {
		passengerName = userProfile.FirstName + " " + userProfile.LastName
	}

	return booking, qrCodeData, issueDate, passengerName, nil
}

func (uc *AccountUseCase) RedeemWalletCoupon(ctx context.Context, userID string, couponCode string) error {
	// validate promo code
	discountAmount, err := uc.repo.GetPromoDiscount(ctx, couponCode)
	if err != nil {
		return err // Returns "invalid or inactive promo code"
	}

	// add balance
	return uc.repo.AddBalance(ctx, userID, discountAmount)
}

func (uc *AccountUseCase) GetExchangeRate(ctx context.Context) float64 {
	// static exchange rate
	return 16000.00 // 1 USD = 17,000 IDR
}
