package grpc

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/travelohi/backend/internal/cart"
	"github.com/travelohi/backend/pkg/utils"
	cartpb "github.com/travelohi/backend/proto/cart/v1"
)

type CartHandler struct {
	cartpb.UnimplementedCartServiceServer
	usecase cart.CartUseCase
}

func NewCartHandler(usecase cart.CartUseCase) *CartHandler {
	return &CartHandler{usecase: usecase}
}

func (h *CartHandler) AddToCart(ctx context.Context, req *cartpb.AddToCartRequest) (*cartpb.CartResponse, error) {
	// extract user id
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	// validate input
	if req.ItemType == "" || req.ReferenceId == "" {
		return nil, status.Error(codes.InvalidArgument, "item_type and reference_id are required")
	}

	// add to cart
	err = h.usecase.AddToCart(ctx, userID, req.ItemType, req.ReferenceId, req.CheckInDate, req.CheckOutDate, req.Quantity, req.LuggageWeight)
	if err != nil {
		return nil, err
	}

	return &cartpb.CartResponse{
		Success: true,
		Message: "Item successfully added to cart and reserved for 15 minutes!",
	}, nil
}

func (h *CartHandler) Checkout(ctx context.Context, req *cartpb.CheckoutRequest) (*cartpb.CheckoutResponse, error) {
	// extract user id
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	// validate input
	if req.PaymentMethod != "hi_wallet" && req.PaymentMethod != "credit_card" {
		return nil, status.Error(codes.InvalidArgument, "invalid payment method")
	}
	if req.PaymentMethod == "credit_card" && req.CreditCardId == "" {
		return nil, status.Error(codes.InvalidArgument, "credit card ID is required")
	}

	// checkout
	transactionID, err := h.usecase.Checkout(ctx, userID, req.PaymentMethod, req.CreditCardId, req.AppliedPromoCode)
	if err != nil {
		return nil, err
	}

	return &cartpb.CheckoutResponse{
		Success:       true,
		Message:       "Checkout completed successfully! Enjoy your trip.",
		TransactionId: transactionID,
	}, nil
}

func (h *CartHandler) ViewCart(ctx context.Context, req *cartpb.ViewCartRequest) (*cartpb.ViewCartResponse, error) {
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	items, subtotal, discount, total, appliedPromo, err := h.usecase.ViewCart(ctx, userID)
	if err != nil {
		return nil, err
	}

	var pbItems []*cartpb.CartItem
	for _, item := range items {
		pbItems = append(pbItems, &cartpb.CartItem{
			Id:              item.ID,
			ItemType:        item.ItemType,
			ReferenceId:     item.ReferenceID,
			DisplayName:     item.DisplayName,
			DisplayImageUrl: item.DisplayImageUrl,
			CheckInDate:     item.CheckInDate,
			CheckOutDate:    item.CheckOutDate,
			ItemPrice:       item.Price,
			Quantity:        item.Quantity,
			LuggageWeight:   item.LuggageWeight,
			Status:          item.Status,
		})
	}

	return &cartpb.ViewCartResponse{
		Items:            pbItems,
		Subtotal:         subtotal,
		DiscountAmount:   discount,
		TotalPrice:       total,
		AppliedPromoCode: appliedPromo,
	}, nil
}

func (h *CartHandler) UpdateCartItem(ctx context.Context, req *cartpb.UpdateCartItemRequest) (*cartpb.CartResponse, error) {
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	err = h.usecase.UpdateCartItem(ctx, userID, req.CartItemId, req.NewCheckInDate, req.NewCheckOutDate)
	if err != nil {
		return nil, err
	}

	return &cartpb.CartResponse{Success: true, Message: "Cart item updated"}, nil
}

func (h *CartHandler) RemoveFromCart(ctx context.Context, req *cartpb.RemoveFromCartRequest) (*cartpb.CartResponse, error) {
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	err = h.usecase.RemoveFromCart(ctx, userID, req.CartItemId)
	if err != nil {
		return nil, err
	}

	return &cartpb.CartResponse{Success: true, Message: "Cart item removed"}, nil
}

func (h *CartHandler) ApplyPromo(ctx context.Context, req *cartpb.ApplyPromoRequest) (*cartpb.ViewCartResponse, error) {
	userID, err := utils.ExtractUserID(ctx)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}

	discount, err := h.usecase.ApplyPromo(ctx, userID, req.PromoCode)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	cartView, err := h.ViewCart(ctx, &cartpb.ViewCartRequest{})
	if err != nil {
		return nil, err
	}

	cartView.DiscountAmount = discount
	cartView.TotalPrice = cartView.Subtotal - discount
	if cartView.TotalPrice < 0 {
		cartView.TotalPrice = 0
	}
	cartView.AppliedPromoCode = req.PromoCode

	return cartView, nil
}

func (h *CartHandler) InternalCreatePromo(ctx context.Context, req *cartpb.InternalCreatePromoRequest) (*cartpb.InternalCreatePromoResponse, error) {
	err := h.usecase.InternalCreatePromo(ctx, req.PromoCode, req.DiscountAmount, req.MaxUses, req.ExpiryDate)
	if err != nil {
		return nil, err
	}
	return &cartpb.InternalCreatePromoResponse{Success: true, Message: "Promo created"}, nil
}
