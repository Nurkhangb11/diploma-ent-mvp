package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

type jwtPayload struct {
	Sub uint  `json:"sub"`
	Exp int64 `json:"exp"`
}

func GenerateJWT(userID uint) (string, error) {
	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		secret = "dev-secret-change-me"
	}

	header := map[string]any{
		"alg": "HS256",
		"typ": "JWT",
	}

	payload := jwtPayload{
		Sub: userID,
		Exp: time.Now().Add(24 * time.Hour).Unix(),
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	enc := base64.RawURLEncoding
	headerB64 := enc.EncodeToString(headerJSON)
	payloadB64 := enc.EncodeToString(payloadJSON)

	signingInput := headerB64 + "." + payloadB64

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(signingInput))
	signature := mac.Sum(nil)
	sigB64 := enc.EncodeToString(signature)

	return signingInput + "." + sigB64, nil
}

func ParseJWT(token string) (uint, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return 0, errors.New("invalid token format")
	}

	secret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if secret == "" {
		secret = "dev-secret-change-me"
	}

	enc := base64.RawURLEncoding
	signingInput := parts[0] + "." + parts[1]

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(signingInput))
	expectedSig := mac.Sum(nil)

	gotSig, err := enc.DecodeString(parts[2])
	if err != nil {
		return 0, fmt.Errorf("invalid token signature: %w", err)
	}

	if !hmac.Equal(gotSig, expectedSig) {
		return 0, errors.New("invalid token signature")
	}

	payloadJSON, err := enc.DecodeString(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid token payload: %w", err)
	}

	var payload jwtPayload
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return 0, fmt.Errorf("invalid token payload json: %w", err)
	}

	if time.Now().Unix() > payload.Exp {
		return 0, errors.New("token expired")
	}

	return payload.Sub, nil
}
