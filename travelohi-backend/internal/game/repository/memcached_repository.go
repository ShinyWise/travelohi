package repository

import (
	"context"
	"errors"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/travelohi/backend/internal/game"
)

type memcachedGameRepo struct {
	client *memcache.Client
}

func NewMemcachedRepository(client *memcache.Client) game.CacheRepository {
	return &memcachedGameRepo{
		client: client,
	}
}

var _ game.CacheRepository = (*memcachedGameRepo)(nil)

func (r *memcachedGameRepo) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	item := &memcache.Item{
		Key:        key,
		Value:      value,
		Expiration: int32(ttl.Seconds()),
	}
	return r.client.Set(item)
}

func (r *memcachedGameRepo) Get(ctx context.Context, key string) ([]byte, error) {
	item, err := r.client.Get(key)
	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			return nil, nil // Return nil, nil when cache miss or not found
		}
		return nil, err
	}
	return item.Value, nil
}

func (r *memcachedGameRepo) Delete(ctx context.Context, key string) error {
	err := r.client.Delete(key)
	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			return nil
		}
		return err
	}
	return nil
}
