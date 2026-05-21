package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/travelohi/backend/internal/admin"
	"github.com/travelohi/backend/internal/admin/worker"
	"github.com/travelohi/backend/internal/auth"
	adminpb "github.com/travelohi/backend/proto/admin/v1"
)

type adminUseCase struct {
	repo       admin.AdminRepository
	cache      auth.CacheRepository
	dispatcher *worker.NotificationDispatcher
}

func NewAdminUseCase(repo admin.AdminRepository, cache auth.CacheRepository, dispatcher *worker.NotificationDispatcher) admin.UseCase {
	return &adminUseCase{
		repo:       repo,
		cache:      cache,
		dispatcher: dispatcher,
	}
}

func (u *adminUseCase) InsertHotel(ctx context.Context, req *adminpb.InsertHotelRequest) error {
	hotel := &admin.Hotel{
		ID:            uuid.New().String(),
		Name:          req.GetName(),
		Description:   req.GetDescription(),
		Address:       req.GetAddress(),
		PictureURLs:   req.GetPictureUrls(),
		Facilities:    req.GetFacilities(),
		StartingPrice: req.GetStartingPrice(),
	}

	return u.repo.InsertHotel(ctx, hotel)
}

func (u *adminUseCase) InsertAirline(ctx context.Context, req *adminpb.InsertAirlineRequest) error {
	airline := &admin.Airline{
		ID:      uuid.New().String(),
		Name:    req.GetName(),
		LogoURL: req.GetLogoUrl(),
	}

	return u.repo.InsertAirline(ctx, airline)
}

func (u *adminUseCase) CreatePromo(ctx context.Context, req *adminpb.CreatePromoRequest) error {
	promo := &admin.Promo{
		ID:             uuid.New().String(),
		PromoCode:      req.GetPromoCode(),
		DiscountAmount: req.GetDiscountAmount(),
		IsActive:       true,
	}
	return u.repo.InsertPromo(ctx, promo)
}

func (u *adminUseCase) TogglePromoStatus(ctx context.Context, req *adminpb.TogglePromoRequest) error {
	return u.repo.UpdatePromoStatus(ctx, req.GetPromoId(), req.GetIsActive())
}

func (u *adminUseCase) GetAllUsers(ctx context.Context, req *adminpb.GetAllUsersRequest) (*adminpb.GetAllUsersResponse, error) {
	// default pagination
	limit := req.GetLimit()
	if limit <= 0 {
		limit = 20
	}

	domainUsers, total, err := u.repo.GetUsers(ctx, limit, req.GetOffset())
	if err != nil {
		return nil, err
	}

	var pbUsers []*adminpb.UserAdminView
	for _, u := range domainUsers {
		pbUsers = append(pbUsers, &adminpb.UserAdminView{
			Id:       u.ID,
			Email:    u.Email,
			FullName: u.FullName,
			IsAdmin:  u.IsAdmin,
			IsBanned: u.IsBanned,
		})
	}

	return &adminpb.GetAllUsersResponse{
		Users:        pbUsers,
		TotalResults: int32(total),
	}, nil
}

func (u *adminUseCase) BanUser(ctx context.Context, req *adminpb.BanUserRequest) error {
	err := u.repo.UpdateUserBanStatus(ctx, req.GetUserId(), req.GetBanStatus())
	if err != nil {
		return err
	}

	// delete session if banned
	if req.GetBanStatus() {
		sessionKey := "session:" + req.GetUserId()
		_ = u.cache.Delete(ctx, sessionKey)
	}

	return nil
}

func (u *adminUseCase) SendBroadcast(ctx context.Context, req *adminpb.SendBroadcastRequest) error {
	u.dispatcher.DispatchBroadcast(req.GetSubject(), req.GetBody())
	return nil
}
