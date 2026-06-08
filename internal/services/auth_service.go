package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

type AuthRegisterRequest struct {
	Name        string
	Email       string
	Password    string
	TargetScore int
}

type AuthLoginRequest struct {
	Email    string
	Password string
}

type UserDTO struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	TargetScore int    `json:"target_score"`
	Avatar      string `json:"avatar"`
}

func userToDTO(u models.User) UserDTO {
	role := u.Role
	if role == "" {
		role = models.RoleStudent
	}
	return UserDTO{
		ID:          u.ID,
		Name:        u.Name,
		Email:       u.Email,
		Role:        role,
		TargetScore: u.TargetScore,
		Avatar:      u.Avatar,
	}
}

func Register(req AuthRegisterRequest) (string, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" || req.Name == "" {
		return "", errors.New("missing required fields")
	}

	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return "", fmt.Errorf("user with email already exists")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	u := models.User{
		Name:         req.Name,
		Email:        req.Email,
		Role:         models.RoleStudent,
		TargetScore:  req.TargetScore,
		PasswordHash: string(passwordHash),
		Avatar:       "",
	}
	if err := database.DB.Create(&u).Error; err != nil {
		return "", err
	}

	token, err := GenerateJWT(u.ID)
	if err != nil {
		return "", err
	}

	return token, nil
}

func Login(req AuthLoginRequest) (string, UserDTO, error) {
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		return "", UserDTO{}, errors.New("missing required fields")
	}

	var u models.User
	if err := database.DB.Where("email = ?", req.Email).First(&u).Error; err != nil {
		return "", UserDTO{}, errors.New("invalid credentials")
	}

	if u.PasswordHash == "" {
		return "", UserDTO{}, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		return "", UserDTO{}, errors.New("invalid credentials")
	}

	token, err := GenerateJWT(u.ID)
	if err != nil {
		return "", UserDTO{}, err
	}

	return token, userToDTO(u), nil
}

func Me(userID uint) (UserDTO, error) {
	var u models.User
	if err := database.DB.First(&u, userID).Error; err != nil {
		return UserDTO{}, errors.New("user not found")
	}
	return userToDTO(u), nil
}

func UpdateProfile(userID uint, name, avatar string, targetScore int) (UserDTO, error) {
	var u models.User
	if err := database.DB.First(&u, userID).Error; err != nil {
		return UserDTO{}, errors.New("user not found")
	}

	if strings.TrimSpace(name) != "" {
		u.Name = strings.TrimSpace(name)
	}
	if avatar != "" {
		u.Avatar = avatar
	}
	u.TargetScore = targetScore

	if err := database.DB.Save(&u).Error; err != nil {
		return UserDTO{}, err
	}

	return userToDTO(u), nil
}
