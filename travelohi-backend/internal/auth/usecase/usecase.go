package usecase

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/travelohi/backend/internal/auth"
	"github.com/travelohi/backend/pkg/hash"
	"github.com/travelohi/backend/pkg/id"
	"github.com/travelohi/backend/pkg/mailer"
	"github.com/travelohi/backend/pkg/token"
	accountpb "github.com/travelohi/backend/proto/account/v1"
)

type authUseCase struct {
	repo           auth.AuthRepository
	cache          auth.CacheRepository
	accountService accountpb.AccountServiceClient
	hasher         hash.PasswordHasher
	idGen          id.Generator
	tokenMaker     token.Maker
	mailer         mailer.EmailSender
}

func NewAuthUseCase(
	repo auth.AuthRepository,
	cache auth.CacheRepository,
	accountService accountpb.AccountServiceClient,
	hasher hash.PasswordHasher,
	idGen id.Generator,
	tokenMaker token.Maker,
	m mailer.EmailSender,
) auth.AuthUseCase {
	return &authUseCase{
		repo:           repo,
		cache:          cache,
		accountService: accountService,
		hasher:         hasher,
		idGen:          idGen,
		tokenMaker:     tokenMaker,
		mailer:         m,
	}
}

var _ auth.AuthUseCase = (*authUseCase)(nil)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$`)

func validateEmailPattern(email string) error {
	if !emailRegex.MatchString(email) {
		return errors.New("Format email harus: nama@domain.com")
	}
	return nil
}

func verifyRecaptcha(token string) error {
	secret := "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"

	resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify",
		url.Values{"secret": {secret}, "response": {token}})
	if err != nil {
		return errors.New("failed to connect to recaptcha server")
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || !result.Success {
		return errors.New("recaptcha validation failed (bot detected)")
	}
	return nil
}

func (uc *authUseCase) RegisterUser(ctx context.Context, req *auth.RegisterData) (*auth.AuthResult, error) {
	if err := validateEmailPattern(req.Email); err != nil {
		return nil, err
	}
	if err := verifyRecaptcha(req.CaptchaToken); err != nil {
		return nil, err
	}

	_, err := uc.repo.GetByEmail(ctx, req.Email)
	if err == nil {
		return nil, errors.New("This email already registered!")
	} else if !errors.Is(err, auth.ErrInvalidCreds) {
		return nil, auth.ErrInternal
	}

	hashedPassword, err := uc.hasher.Hash(req.Password)

	if err != nil {
		return nil, auth.ErrHashing
	}

	hashedSecurityAnswer, err := uc.hasher.Hash(strings.ToLower(strings.TrimSpace(req.SecurityAnswer)))
	if err != nil {
		return nil, auth.ErrHashing
	}

	// generate account id
	newUserID := uc.idGen.Generate()

	vaultRecord := &auth.Auth{
		ID:                 newUserID,
		Email:              req.Email,
		PasswordHash:       hashedPassword,
		SecurityQuestionID: req.SecurityQuestionID,
		SecurityAnswerHash: hashedSecurityAnswer,
		IsBanned:           false,
	}
	// masukin ke repo
	if err := uc.repo.Create(ctx, vaultRecord); err != nil {
		return nil, auth.ErrInternal
	}

	var profilePicBytes []byte
	if req.ProfilePictureURL != "" {
		b64Data := req.ProfilePictureURL
		if idx := strings.Index(b64Data, ";base64,"); idx != -1 {
			b64Data = b64Data[idx+8:]
		}
		decoded, err := base64.StdEncoding.DecodeString(b64Data)
		if err == nil {
			profilePicBytes = decoded
		} else {
			log.Printf("[Register] Failed to decode profile picture base64: %v", err)
		}
	}

	// create account, panggil accountServices
	_, err = uc.accountService.InitProfile(ctx, &accountpb.InitProfileRequest{
		Id:                   newUserID,
		Email:                req.Email,
		FirstName:            req.FirstName,
		LastName:             req.LastName,
		Gender:               req.Gender,
		Dob:                  req.DOB,
		NewsletterSubscribed: req.SubscribeNewsletter,
		ProfilePicture:       profilePicBytes,
	})

	if err != nil {
		return nil, errors.New("Failed to initialize Profile!")
	}

	return &auth.AuthResult{
		UserID:  newUserID,
		Message: "Registration successful! Please log in.",
	}, nil
}

func (uc *authUseCase) Login(ctx context.Context, email, password string, captchaToken string) (*auth.AuthResult, error) {
	if err := validateEmailPattern(email); err != nil {
		return nil, err
	}
	if err := verifyRecaptcha(captchaToken); err != nil {
		return nil, err
	}

	user, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	if user.IsBanned {
		return nil, errors.New("Your account has been suspended")
	}

	if !user.IsActive {
		return nil, errors.New("Your account has not been activated")
	}

	// crypto check
	if err := uc.hasher.Compare(user.PasswordHash, password); err != nil {
		return nil, auth.ErrInvalidCreds
	}

	// generate session
	sessionID := uc.idGen.Generate()

	sessionKey := "session:" + user.ID

	// set session to cache
	if err := uc.cache.Set(ctx, sessionKey, []byte(sessionID), 86400); err != nil {
		return nil, auth.ErrInternal
	}

	// generate access token
	accessToken, err := uc.tokenMaker.CreateToken(user.ID, sessionID, 24*time.Hour)
	if err != nil {
		return nil, auth.ErrInternal
	}

	return &auth.AuthResult{
		UserID:      user.ID,
		AccessToken: accessToken,
		Message:     "Login successful!",
	}, nil

}

func (uc *authUseCase) LoginWithOTP(ctx context.Context, email, otp string) (*auth.AuthResult, error) {
	if err := validateEmailPattern(email); err != nil {
		return nil, err
	}
	otpKey := "otp:" + email
	cachedOTPBytes, err := uc.cache.Get(ctx, otpKey)
	if err != nil {
		return nil, errors.New("OTP code is invalid or has expired")
	}

	if string(cachedOTPBytes) != otp {
		return nil, errors.New("incorrect OTP code")
	}
	_ = uc.cache.Delete(ctx, otpKey)
	user, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, auth.ErrInternal
	}

	if user.IsBanned {
		return nil, errors.New("Your account has been suspended")
	}

	if !user.IsActive {
		return nil, errors.New("Your account has not been activated")
	}

	sessionID := uc.idGen.Generate()
	sessionKey := "session:" + user.ID

	if err := uc.cache.Set(ctx, sessionKey, []byte(sessionID), 86400); err != nil {
		return nil, auth.ErrInternal
	}

	accessToken, err := uc.tokenMaker.CreateToken(user.ID, sessionID, 24*time.Hour)
	if err != nil {
		return nil, auth.ErrInternal
	}

	return &auth.AuthResult{
		UserID:      user.ID,
		AccessToken: accessToken,
		Message:     "OTP Login successful!",
	}, nil

}

func (uc *authUseCase) SendOTP(ctx context.Context, email string) error {
	if err := validateEmailPattern(email); err != nil {
		return err
	}
	_, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCreds) {
			return nil
		}
		return auth.ErrInternal
	}

	// generate otp
	maxNumber := big.NewInt(1000000)
	randNumber, _ := rand.Int(rand.Reader, maxNumber)
	otpcode := fmt.Sprintf("%06d", randNumber.Int64())

	// simpen otp ke memcached
	otpKey := "otp:" + email

	if err := uc.cache.Set(ctx, otpKey, []byte(otpcode), 300); err != nil {
		return err
	}

	htmlBody := fmt.Sprintf("<h2>Travelohi OTP</h2><p>Your OTP Code is: <b>%s</b></p><p>This code is valid for 5 minutes.</p>", otpcode)
	if err := uc.mailer.SendEmail([]string{email}, "Your Travelohi Login OTP", htmlBody); err != nil {
		log.Printf("Failed to send OTP to %s: %v\n", email, err)
		return errors.New("failed to send OTP email")
	}

	log.Printf("📧 EMAIL SENT TO %s: Your OTP Code is %s (Valid for 5 mins)\n", email, otpcode)

	return nil
}

func (uc *authUseCase) Logout(ctx context.Context, token string) error {
	userID, _, err := uc.tokenMaker.VerifyToken(token)
	if err != nil {
		return nil
	}

	sessionKey := "session:" + userID
	if err := uc.cache.Delete(ctx, sessionKey); err != nil {
		return auth.ErrInternal
	}
	return nil
}

func (uc *authUseCase) GetSecurityQuestion(ctx context.Context, email string) (int32, error) {
	if err := validateEmailPattern(email); err != nil {
		return 0, err
	}
	user, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		return 0, err
	}
	if user.IsBanned {
		return 0, errors.New("account suspended")
	}
	return user.SecurityQuestionID, nil
}

func (uc *authUseCase) ResetPassword(ctx context.Context, email string, questionID int32, answer string, newPassword string) (*auth.AuthResult, error) {
	if err := validateEmailPattern(email); err != nil {
		return nil, err
	}
	user, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		return nil, errors.New("incorrect security question or answer")
	}

	if user.IsBanned {
		return nil, errors.New("account suspended")
	}

	// verify security question
	if user.SecurityQuestionID != questionID {
		return nil, errors.New("incorrect security question or answer")
	}

	// verify security answer
	if err := uc.hasher.Compare(user.SecurityAnswerHash, strings.ToLower(strings.TrimSpace(answer))); err != nil {
		return nil, errors.New("incorrect security question or answer")
	}

	// validate new password
	if err := uc.hasher.Compare(user.PasswordHash, newPassword); err == nil {
		return nil, errors.New("new password cannot be the same as the old password")
	}

	// hash and update password
	hashedNewPassword, err := uc.hasher.Hash(newPassword)
	if err != nil {
		return nil, auth.ErrHashing
	}

	user.PasswordHash = hashedNewPassword

	if err := uc.repo.Update(ctx, user); err != nil {
		return nil, auth.ErrInternal
	}

	return &auth.AuthResult{
		UserID:  user.ID,
		Message: "Password reset successfully. You can now log in.",
	}, nil
}

func (uc *authUseCase) CheckEmail(ctx context.Context, email string, captchaToken string) (bool, error) {
	if err := validateEmailPattern(email); err != nil {
		return false, err
	}
	// verify recaptcha
	if err := verifyRecaptcha(captchaToken); err != nil {
		return false, err
	}

	// check if email exists
	_, err := uc.repo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCreds) {
			return false, nil
		}
		return false, auth.ErrInternal
	}

	return true, nil
}
