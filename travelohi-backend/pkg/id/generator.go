package id

import "github.com/google/uuid"

type Generator interface {
	Generate() string
}

type UUIDGenerator struct{}

func NewUUIDGenerator() Generator {
	return &UUIDGenerator{}
}

func (g *UUIDGenerator) Generate() string {
	return uuid.New().String()
}
