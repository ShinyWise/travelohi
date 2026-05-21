// internal/cart/usecase/cart_usecase.go
package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"google.golang.org/grpc/metadata"

	"github.com/travelohi/backend/internal/cart"
	accountpb "github.com/travelohi/backend/proto/account/v1"
	flightpb "github.com/travelohi/backend/proto/flight/v1"
)

type cartUseCase struct {
	repo          cart.CartRepository
	flightClient  flightpb.FlightServiceClient   // The gRPC Client!
	accountClient accountpb.AccountServiceClient // For Financials
}

func NewCartUseCase(repo cart.CartRepository, flightClient flightpb.FlightServiceClient, accountClient accountpb.AccountServiceClient) cart.CartUseCase {
	return &cartUseCase{
		repo:          repo,
		flightClient:  flightClient,
		accountClient: accountClient,
	}
}

func (uc *cartUseCase) AddToCart(ctx context.Context, userID, itemType, referenceID, checkIn, checkOut string, quantity int32, luggageWeight int32) error {

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
		subtotal += item.Price
	}

	return items, subtotal, 0, subtotal, "", nil
}

func (uc *cartUseCase) UpdateCartItem(ctx context.Context, userID, itemID, newCheckIn, newCheckOut string) error {
	return uc.repo.UpdateCartItem(ctx, itemID, userID, newCheckIn, newCheckOut)
}

func (uc *cartUseCase) RemoveFromCart(ctx context.Context, userID, itemID string) error {
	return uc.repo.RemoveFromCart(ctx, itemID, userID)
}

func (uc *cartUseCase) ApplyPromo(ctx context.Context, userID, promoCode string) error {
	promo, err := uc.repo.GetPromoByCode(ctx, promoCode)
	if err != nil {
		return errors.New("invalid promo code")
	}

	if promo.CurrentUses >= promo.MaxUses {
		return errors.New("promo code usage limit reached")
	}

	return nil
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

func (uc *cartUseCase) Checkout(ctx context.Context, userID, paymentMethod, creditCardID, appliedPromoCode string) (string, error) {

	// fetch active cart items
	items, err := uc.repo.GetActiveCartItems(ctx, userID)
	if err != nil || len(items) == 0 {
		return "", errors.New("cart is empty or could not be fetched")
	}

	// calculate total price
	var totalPrice int64 = 0
	for _, item := range items {
		totalPrice += item.Price
	}

	// apply promo if valid
	var discountAmount int64 = 0
	if appliedPromoCode != "" {
		promo, err := uc.repo.GetPromoByCode(ctx, appliedPromoCode)
		if err == nil && promo.CurrentUses < promo.MaxUses {
			discountAmount = promo.DiscountAmount
			totalPrice -= discountAmount
			if totalPrice < 0 {
				totalPrice = 0
			}
		}
	}

	// token relay
	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		ctx = metadata.NewOutgoingContext(ctx, md)
	}

	// financial deduction
	if paymentMethod == "hi_wallet" {
		_, err := uc.accountClient.DeductWallet(ctx, &accountpb.DeductWalletRequest{
			UserId: userID,
			Amount: totalPrice,
		})
		if err != nil {
			return "", err
		}
	}

	// finalize database state
	err = uc.repo.MarkCartAsPaid(ctx, userID)
	if err != nil {
		// compensating transaction
		if paymentMethod == "hi_wallet" {
			_, _ = uc.accountClient.RefundWallet(ctx, &accountpb.RefundWalletRequest{
				UserId: userID,
				Amount: totalPrice,
			})
		}
		return "", errors.New("checkout failed, your wallet has been refunded")
	}

	// generate transaction id
	transactionID := "TXN-" + items[0].ID[:8]

	// increment promo usage
	if appliedPromoCode != "" {
		_ = uc.repo.IncrementPromoUsage(ctx, appliedPromoCode)
	}

	// create booking via account service
	for _, item := range items {
		_, _ = uc.accountClient.InternalCreateBooking(ctx, &accountpb.InternalCreateBookingRequest{
			UserId:        userID,
			TransactionId: transactionID,
			ItemType:      item.ItemType,
			DisplayName:   "Booking for " + item.ReferenceID,
			CheckInDate:   "",
			CheckOutDate:  "",
		})
	}

	return transactionID, nil
}
