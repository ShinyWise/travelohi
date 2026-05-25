package interceptor

import (
	"context"
	"strings"

	"github.com/travelohi/backend/internal/auth"
	"github.com/travelohi/backend/pkg/token"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ContextKey string

const UserIDKey ContextKey = "x-user-id"

type RoleRepository interface {
	IsAdmin(ctx context.Context, userID string) (bool, error)
}

type AuthInterceptor struct {
	tokenMaker   token.Maker
	cache        auth.CacheRepository
	roleRepo     RoleRepository
	publicRoutes map[string]bool
}

func NewAuthInterceptor(tokenMaker token.Maker, cache auth.CacheRepository, roleRepo RoleRepository) *AuthInterceptor {
	publicRoutes := map[string]bool{
		"/travelohi.v1.auth.AuthService/Login":               true,
		"/travelohi.v1.auth.AuthService/Register":            true,
		"/travelohi.v1.auth.AuthService/SendOTP":             true,
		"/travelohi.v1.auth.AuthService/LoginWithOTP":        true,
		"/travelohi.v1.auth.AuthService/CheckEmail":          true,
		"/travelohi.v1.auth.AuthService/GetSecurityQuestion": true,
		"/travelohi.v1.auth.AuthService/ResetPassword":       true,
		// internal microservice call: perlu dipake buat authService pas register
		"/travelohi.v1.account.AccountService/InitProfile": true,

		// Hotel Service public endpoints
		"/travelohi.v1.hotel.HotelService/SearchHotels":    true,
		"/travelohi.v1.hotel.HotelService/GetHotelDetails": true,

		// Flight Service public endpoints
		"/travelohi.v1.flight.FlightService/SearchFlights":      true,
		"/travelohi.v1.flight.FlightService/GetFlightDetails":   true,
		"/travelohi.v1.flight.FlightService/GetFlightSeats":     true,
		"/travelohi.v1.flight.FlightService/InternalLockSeat":   true,
		"/travelohi.v1.flight.FlightService/InternalUnlockSeat": true,

		// Telemetry Service public recommendations
		"/travelohi.v1.telemetry.TelemetryService/GetGlobalRecommendations":     true,
		"/travelohi.v1.telemetry.TelemetryService/GetPopularFlightDestinations": true,
		"/travelohi.v1.telemetry.TelemetryService/GetPopularHotels":             true,
	}

	return &AuthInterceptor{
		tokenMaker:   tokenMaker,
		cache:        cache,
		roleRepo:     roleRepo,
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

		// session validation
		sessionKey := "session:" + userID
		cachedSessionBytes, err := i.cache.Get(ctx, sessionKey)

		cachedData := string(cachedSessionBytes)
		cachedParts := strings.Split(cachedData, ":")
		cachedSessionID := cachedParts[0]

		if err != nil || cachedSessionID != sessionID {
			return nil, status.Errorf(codes.Unauthenticated, "session expired or logged in from another device")
		}

		// rbac validation
		if strings.HasPrefix(info.FullMethod, "/travelohi.v1.admin.AdminService/") {
			isAdmin := false

			if len(cachedParts) == 2 && cachedParts[1] == "true" {
				isAdmin = true
			} else if i.roleRepo != nil {
				isAdmin, err = i.roleRepo.IsAdmin(ctx, userID)
				if err != nil {
					return nil, status.Errorf(codes.Internal, "failed to verify user permissions")
				}
			}

			if !isAdmin {
				return nil, status.Errorf(codes.PermissionDenied, "permission denied: administrator privileges required")
			}
		}

		// context injection
		newCtx := context.WithValue(ctx, UserIDKey, userID)

		return handler(newCtx, req)
	}
}

type wrappedStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedStream) Context() context.Context {
	return w.ctx
}

// stream returns grpc stream server interceptor
func (i *AuthInterceptor) Stream() grpc.StreamServerInterceptor {
	return func(
		srv interface{},
		ss grpc.ServerStream,
		info *grpc.StreamServerInfo,
		handler grpc.StreamHandler,
	) error {
		// route filtering
		if i.publicRoutes[info.FullMethod] {
			return handler(srv, ss)
		}

		ctx := ss.Context()

		// metadata extraction
		tokenString, err := token.ExtractTokenFromContext(ctx)
		if err != nil {
			return status.Errorf(codes.Unauthenticated, "authorization token is not provided")
		}

		// cryptographic check
		userID, sessionID, err := i.tokenMaker.VerifyToken(tokenString)
		if err != nil {
			return status.Errorf(codes.Unauthenticated, "invalid or expired token")
		}

		// session validation
		sessionKey := "session:" + userID
		cachedSessionBytes, err := i.cache.Get(ctx, sessionKey)

		cachedData := string(cachedSessionBytes)
		cachedParts := strings.Split(cachedData, ":")
		cachedSessionID := cachedParts[0]

		if err != nil || cachedSessionID != sessionID {
			return status.Errorf(codes.Unauthenticated, "session expired or logged in from another device")
		}

		// rbac validation
		if strings.HasPrefix(info.FullMethod, "/travelohi.v1.admin.AdminService/") {
			isAdmin := false

			if len(cachedParts) == 2 && cachedParts[1] == "true" {
				isAdmin = true
			} else if i.roleRepo != nil {
				isAdmin, err = i.roleRepo.IsAdmin(ctx, userID)
				if err != nil {
					return status.Errorf(codes.Internal, "failed to verify user permissions")
				}
			}

			if !isAdmin {
				return status.Errorf(codes.PermissionDenied, "permission denied: administrator privileges required")
			}
		}

		// context injection
		newCtx := context.WithValue(ctx, UserIDKey, userID)
		return handler(srv, &wrappedStream{ServerStream: ss, ctx: newCtx})
	}
}
