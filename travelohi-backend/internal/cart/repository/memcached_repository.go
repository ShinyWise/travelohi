package repository

import (
	"context"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/travelohi/backend/internal/cart"
)

type promoMemcachedRepo struct {
	client *memcache.Client
}

func NewPromoMemcachedRepository(client *memcache.Client) cart.PromoCacheRepository {
	return &promoMemcachedRepo{client: client}
}

func (r *promoMemcachedRepo) SetUserPromo(ctx context.Context, userID, promoCode string, expiration time.Duration) error {
	key := "cart_promo_" + userID
	item := &memcache.Item{
		Key:        key,
		Value:      []byte(promoCode),
		Expiration: int32(expiration.Seconds()),
	}
	return r.client.Set(item)
}

func (r *promoMemcachedRepo) GetUserPromo(ctx context.Context, userID string) (string, error) {
	key := "cart_promo_" + userID
	item, err := r.client.Get(key)
	if err != nil {
		return "", err
	}
	return string(item.Value), nil
}

func (r *promoMemcachedRepo) DeleteUserPromo(ctx context.Context, userID string) error {
	key := "cart_promo_" + userID
	err := r.client.Delete(key)
	if err == memcache.ErrCacheMiss {
		return nil
	}
	return err
}
