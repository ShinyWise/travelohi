package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/metadata"

	"github.com/travelohi/backend/internal/cart"
	"github.com/travelohi/backend/pkg/mailer"
	accountpb "github.com/travelohi/backend/proto/account/v1"
	flightpb "github.com/travelohi/backend/proto/flight/v1"
)

type cartUseCase struct {
	repo          cart.CartRepository
	flightClient  flightpb.FlightServiceClient
	accountClient accountpb.AccountServiceClient
	mailer        mailer.EmailSender
	promoCache    cart.PromoCacheRepository
}

func NewCartUseCase(repo cart.CartRepository, flightClient flightpb.FlightServiceClient, accountClient accountpb.AccountServiceClient, m mailer.EmailSender, promoCache cart.PromoCacheRepository) cart.CartUseCase {
	return &cartUseCase{
		repo:          repo,
		flightClient:  flightClient,
		accountClient: accountClient,
		mailer:        m,
		promoCache:    promoCache,
	}
}

func calculateNights(checkIn, checkOut string) int64 {
	t1, err1 := time.Parse("2006-01-02", checkIn)
	t2, err2 := time.Parse("2006-01-02", checkOut)
	if err1 != nil || err2 != nil {
		t1, err1 = time.Parse("2006-01-02 15:04", checkIn)
		t2, err2 = time.Parse("2006-01-02 15:04", checkOut)
		if err1 != nil || err2 != nil {
			return 1
		}
	}
	days := int64(t2.Sub(t1).Hours() / 24)
	if days <= 0 {
		return 1
	}
	return days
}

func (uc *cartUseCase) AddToCart(ctx context.Context, userID, itemType, referenceID, checkIn, checkOut string, quantity int32, luggageWeight int32) error {
	// check duplicate for hotel rooms
	if itemType == "hotel_room" {
		exists, err := uc.repo.CheckItemInCart(ctx, userID, referenceID)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("kamar ini sudah ada di dalam keranjang belanja Anda")
		}
	}

	// extract metadata from incoming context
	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		// append to outgoing context
		ctx = metadata.NewOutgoingContext(ctx, md)
	}

	// lock seat and fetch price
	var itemPrice int64 = 0

	if itemType == "flight_seat" {
		resp, err := uc.flightClient.InternalLockSeat(ctx, &flightpb.LockSeatRequest{
			SeatId: referenceID,
		})

		if err != nil {
			return err
		}

		itemPrice = resp.LockedPrice
	} else if itemType == "hotel_room" {
		pricePerNight, err := uc.repo.GetRoomPrice(ctx, referenceID)
		if err != nil {
			return errors.New("failed to fetch hotel room price")
		}
		nights := calculateNights(checkIn, checkOut)
		itemPrice = pricePerNight * nights
	}

	// save to cart database
	newItem := cart.CartItem{
		ID:            uuid.New().String(),
		UserID:        userID,
		ItemType:      itemType,
		ReferenceID:   referenceID,
		Price:         itemPrice,
		Status:        "in_cart",
		LuggageWeight: luggageWeight,
		Quantity:      quantity,
		CheckInDate:   checkIn,
		CheckOutDate:  checkOut,
	}

	err := uc.repo.AddToCart(ctx, newItem)
	if err != nil {
		return errors.New("failed to save to cart")
	}

	return nil
}

func (uc *cartUseCase) ViewCart(ctx context.Context, userID string) ([]cart.CartItem, int64, int64, int64, string, error) {
	items, err := uc.repo.GetActiveCartItems(ctx, userID)
	if err != nil {
		return nil, 0, 0, 0, "", err
	}

	var subtotal int64 = 0
	for _, item := range items {
		subtotal += item.Price * int64(item.Quantity)
	}

	var discountAmount int64 = 0
	var totalPrice int64 = subtotal
	var appliedPromo string = ""

	promoCode, err := uc.promoCache.GetUserPromo(ctx, userID)
	if err == nil && promoCode != "" {
		promo, err := uc.repo.GetPromoByCode(ctx, promoCode)
		if err == nil && promo.CurrentUses < promo.MaxUses {
			discountAmount = promo.DiscountAmount
			totalPrice = subtotal - discountAmount
			if totalPrice < 0 {
				totalPrice = 0
			}
			appliedPromo = promoCode
		}
	}

	return items, subtotal, discountAmount, totalPrice, appliedPromo, nil
}

func (uc *cartUseCase) UpdateCartItem(ctx context.Context, userID, itemID, newCheckIn, newCheckOut string) error {
	item, err := uc.repo.GetCartItemByID(ctx, itemID, userID)
	if err != nil {
		return err
	}

	newPrice := item.Price
	if item.ItemType == "hotel_room" {
		pricePerNight, err := uc.repo.GetRoomPrice(ctx, item.ReferenceID)
		if err == nil {
			nights := calculateNights(newCheckIn, newCheckOut)
			newPrice = pricePerNight * nights
		}
	}

	return uc.repo.UpdateCartItem(ctx, itemID, userID, newCheckIn, newCheckOut, newPrice)
}

func (uc *cartUseCase) RemoveFromCart(ctx context.Context, userID, itemID string) error {
	return uc.repo.RemoveFromCart(ctx, itemID, userID)
}

func (uc *cartUseCase) ApplyPromo(ctx context.Context, userID, promoCode string) (int64, error) {
	promo, err := uc.repo.GetPromoByCode(ctx, promoCode)
	if err != nil {
		return 0, errors.New("invalid or inactive promo code")
	}

	if promo.CurrentUses >= promo.MaxUses {
		return 0, errors.New("promo code usage limit reached")
	}

	used, err := uc.repo.HasUserUsedPromo(ctx, userID, promoCode)
	if err == nil && used {
		return 0, errors.New("promo code has already been used by your account")
	}

	_ = uc.promoCache.SetUserPromo(ctx, userID, promoCode, 15*time.Minute)

	return promo.DiscountAmount, nil
}

func (uc *cartUseCase) InternalCreatePromo(ctx context.Context, promoCode string, discountAmount int64, maxUses int32, expiryDate string) error {
	promo := cart.Promo{
		ID:             uuid.New().String(),
		PromoCode:      promoCode,
		DiscountAmount: discountAmount,
		MaxUses:        maxUses,
	}
	return uc.repo.CreatePromo(ctx, promo)
}

func (uc *cartUseCase) Checkout(ctx context.Context, userID, paymentMethod, creditCardID string) (string, error) {

	items, err := uc.repo.GetActiveCartItems(ctx, userID)
	if err != nil || len(items) == 0 {
		return "", errors.New("cart is empty or could not be fetched")
	}

	var totalPrice int64 = 0
	for _, item := range items {
		if item.Status == "expired" {
			return "", errors.New("cannot checkout with expired items in the cart. Please remove them first")
		}
		totalPrice += item.Price * int64(item.Quantity)
	}

	var discountAmount int64 = 0
	
	appliedPromoCode, err := uc.promoCache.GetUserPromo(ctx, userID)
	if err == nil && appliedPromoCode != "" {
		promo, err := uc.repo.GetPromoByCode(ctx, appliedPromoCode)
		if err == nil && promo.CurrentUses < promo.MaxUses {
			used, err := uc.repo.HasUserUsedPromo(ctx, userID, appliedPromoCode)
			if err == nil && used {
				return "", errors.New("promo code has already been used by your account")
			}
			discountAmount = promo.DiscountAmount
			totalPrice -= discountAmount
			if totalPrice < 0 {
				totalPrice = 0
			}
		}
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		ctx = metadata.NewOutgoingContext(ctx, md)
	}

	if paymentMethod == "hi_wallet" && totalPrice > 0 {
		_, err := uc.accountClient.DeductWallet(ctx, &accountpb.DeductWalletRequest{
			UserId: userID,
			Amount: totalPrice,
		})
		if err != nil {
			return "", err
		}
	}

	err = uc.repo.MarkCartAsPaid(ctx, userID)
	if err != nil {
		if paymentMethod == "hi_wallet" {
			_, _ = uc.accountClient.RefundWallet(ctx, &accountpb.RefundWalletRequest{
				UserId: userID,
				Amount: totalPrice,
			})
		}
		return "", errors.New("checkout failed, your wallet has been refunded")
	}

	transactionID := "TXN-" + items[0].ID[:8]

	if appliedPromoCode != "" {
		_ = uc.repo.IncrementPromoUsage(ctx, appliedPromoCode)
		_ = uc.repo.RecordPromoUsage(ctx, userID, appliedPromoCode)
		_ = uc.promoCache.DeleteUserPromo(ctx, userID)
	}

	for _, item := range items {
		_, err = uc.accountClient.InternalCreateBooking(ctx, &accountpb.InternalCreateBookingRequest{
			UserId:        userID,
			TransactionId: transactionID,
			ItemType:      item.ItemType,
			DisplayName:   fmt.Sprintf("%s|%s", item.DisplayName, item.ReferenceID),
			CheckInDate:   item.CheckInDate,
			CheckOutDate:  item.CheckOutDate,
		})
		if err != nil {
			if paymentMethod == "hi_wallet" {
				_, _ = uc.accountClient.RefundWallet(ctx, &accountpb.RefundWalletRequest{
					UserId: userID,
					Amount: totalPrice,
				})
			}
			return "", fmt.Errorf("failed to create booking record: %w", err)
		}
	}

	profileResp, profileErr := uc.accountClient.GetProfile(ctx, &accountpb.GetProfileRequest{UserId: userID})
	if profileErr == nil && profileResp.Profile != nil {
		emailItems := make([]mailer.PaymentEmailItem, 0, len(items))
		for _, item := range items {
			emailItems = append(emailItems, mailer.PaymentEmailItem{
				Name:  item.DisplayName,
				Price: item.Price * int64(item.Quantity),
			})
		}
		htmlBody := mailer.GeneratePaymentSuccessEmail(transactionID, totalPrice, emailItems)
		if err := uc.mailer.SendEmail([]string{profileResp.Profile.Email}, "Payment Confirmation - TraveloHI", htmlBody); err != nil {
			log.Printf("[Cart] Failed to send payment receipt email to user %s: %v\n", userID, err)
		} else {
			log.Printf("📧 Payment receipt email sent for transaction %s\n", transactionID)
		}
	} else {
		log.Printf("[Cart] Failed to fetch profile for user %s: %v\n", userID, profileErr)
	}

	return transactionID, nil
}
