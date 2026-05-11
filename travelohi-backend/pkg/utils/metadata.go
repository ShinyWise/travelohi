package auth // or utils

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// asumsi interceptor udah handle security dan inject id
func ExtractUserID(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", status.Error(codes.Unauthenticated, "Unauthorized: metadata missing")
	}

	userIDs := md.Get("x-user-id")
	if len(userIDs) == 0 || userIDs[0] == "" {
		return "", status.Error(codes.Unauthenticated, "Unauthorized: invalid or missing user session")
	}

	return userIDs[0], nil
}
