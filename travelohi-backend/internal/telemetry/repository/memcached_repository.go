package repository

import (
	"context"
	"errors"
	"time"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/travelohi/backend/internal/telemetry"
)

type memcachedRepo struct {
	client *memcache.Client
}

func NewMemcachedRepository(client *memcache.Client) telemetry.CacheRepository {
	return &memcachedRepo{
		client: client,
	}
}

func (r *memcachedRepo) Get(ctx context.Context, key string) ([]byte, error) {
	item, err := r.client.Get(key)
	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			return nil, errors.New("cache miss")
		}
		return nil, err
	}
	return item.Value, nil
}

func (r *memcachedRepo) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	item := &memcache.Item{
		Key:        key,
		Value:      value,
		Expiration: int32(ttl.Seconds()),
	}
	return r.client.Set(item)
}

func (r *memcachedRepo) Delete(ctx context.Context, key string) error {
	err := r.client.Delete(key)
	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			return nil
		}
		return err
	}
	return nil
}
