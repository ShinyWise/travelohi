package token

import (
	"context"
	"errors"
	"strings"

	"google.golang.org/grpc/metadata"
)

func ExtractTokenFromContext(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", errors.New("missing metadata")
	}

	authHeaders := md.Get("authorization")
	if len(authHeaders) == 0 {
		return "", errors.New("authorization token is not provided")
	}

	parts := strings.Split(authHeaders[0], " ")
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", errors.New("invalid authorization header format")
	}

	return parts[1], nil
}
