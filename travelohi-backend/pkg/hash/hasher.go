package hash

import "golang.org/x/crypto/bcrypt"

type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) error
}

type BcryptHasher struct{}

func NewBcryptHasher() PasswordHasher {
	return &BcryptHasher{}
}

func (h *BcryptHasher) Hash(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func (h *BcryptHasher) Compare(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
