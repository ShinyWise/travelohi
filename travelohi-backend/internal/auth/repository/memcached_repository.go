package repository

import (
	"context"
	"errors"

	"github.com/bradfitz/gomemcache/memcache"
	"github.com/travelohi/backend/internal/auth"
)

type MemcachedRepository struct {
	client *memcache.Client
}

func NewMemcachedRepository(client *memcache.Client) auth.CacheRepository {
	return &MemcachedRepository{
		client: client,
	}
}

var _ auth.CacheRepository = (*MemcachedRepository)(nil)

func (r *MemcachedRepository) Set(ctx context.Context, key string, value []byte, expirationSeconds int32) error {
	item := &memcache.Item{
		Key:        key,
		Value:      value,
		Expiration: expirationSeconds,
	}

	return r.client.Set(item)
}

func (r *MemcachedRepository) Get(ctx context.Context, key string) ([]byte, error) {
	item, err := r.client.Get(key)
	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			return nil, errors.New("cache miss: token or OTP not found")
		}
		return nil, err
	}

	return item.Value, nil
}

func (r *MemcachedRepository) Delete(ctx context.Context, key string) error {
	err := r.client.Delete(key)
	if err != nil {
		if errors.Is(err, memcache.ErrCacheMiss) {
			return nil
		}
		return err
	}
	return nil
}
