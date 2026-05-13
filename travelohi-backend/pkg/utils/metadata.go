package utils

import (
	"context"
	"errors"

	"github.com/travelohi/backend/internal/interceptor"
)

func ExtractUserID(ctx context.Context) (string, error) {
	userID, ok := ctx.Value(interceptor.UserIDKey).(string)
	if !ok || userID == "" {
		return "", errors.New("unauthorized: missing or invalid user session in context")
	}

	return userID, nil
}
