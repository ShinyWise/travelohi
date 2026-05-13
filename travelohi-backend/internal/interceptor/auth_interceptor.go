package interceptor

import (
	"context"

	"github.com/travelohi/backend/internal/auth"
	"github.com/travelohi/backend/pkg/token"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type contextKey string

const UserIDKey contextKey = "x-user-id"

type AuthInterceptor struct {
	tokenMaker token.Maker
	cache      auth.CacheRepository
	// simpen routes yang ga perlu token
	publicRoutes map[string]bool
}

func NewAuthInterceptor(tokenMaker token.Maker, cache auth.CacheRepository) *AuthInterceptor {
	publicRoutes := map[string]bool{
		"/travelohi.v1.auth.AuthService/Login":        true,
		"/travelohi.v1.auth.AuthService/Register":     true,
		"/travelohi.v1.auth.AuthService/SendOTP":      true,
		"/travelohi.v1.auth.AuthService/LoginWithOTP": true,
		// internal microservice call: perlu dipake buat authService pas register
		"/travelohi.v1.account.AccountService/InitProfile": true,
	}

	return &AuthInterceptor{
		tokenMaker:   tokenMaker,
		cache:        cache,
		publicRoutes: publicRoutes,
	}
}

// function buat grpc unary interceptor
func (i *AuthInterceptor) Unary() grpc.UnaryServerInterceptor {
	return func(
		ctx context.Context,
		req interface{},
		info *grpc.UnaryServerInfo,
		handler grpc.UnaryHandler,
	) (interface{}, error) {
		// route filtering
		if i.publicRoutes[info.FullMethod] {
			return handler(ctx, req)
		}

		// metadata extraction
		tokenString, err := token.ExtractTokenFromContext(ctx)
		if err != nil {
			return nil, status.Errorf(codes.Unauthenticated, "authorization token is not provided")
		}

		// cryptographic check
		userID, sessionID, err := i.tokenMaker.VerifyToken(tokenString)
		if err != nil {
			return nil, status.Errorf(codes.Unauthenticated, "invalid or expired token")
		}

		// check session masi valid atau ga
		sessionKey := "session:" + userID
		cachedSessionBytes, err := i.cache.Get(ctx, sessionKey)
		if err != nil || string(cachedSessionBytes) != sessionID {

			return nil, status.Errorf(codes.Unauthenticated, "session expired or logged in from another device")
		}

		newCtx := context.WithValue(ctx, UserIDKey, userID)

		return handler(newCtx, req)
	}
}
