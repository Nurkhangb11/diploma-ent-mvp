package handlers

import (
	"diploma-ent-mvp/internal/middleware"
	"diploma-ent-mvp/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AuthRegisterRequest struct {
	Name        string `json:"name" binding:"required"`
	Email       string `json:"email" binding:"required"`
	Password    string `json:"password" binding:"required"`
	TargetScore int    `json:"target_score"`
}

type AuthLoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthTokenResponse struct {
	Token string           `json:"token"`
	User  services.UserDTO `json:"user"`
}

type AuthMeResponse struct {
	User services.UserDTO `json:"user"`
}

func Register(c *gin.Context) {
	var req AuthRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := services.Register(services.AuthRegisterRequest{
		Name:        req.Name,
		Email:       req.Email,
		Password:    req.Password,
		TargetScore: req.TargetScore,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Return user data too (by parsing token).
	userID := uint(0)
	if parsedID, err := services.ParseJWT(token); err == nil {
		userID = parsedID
	}
	user, _ := services.Me(userID)

	c.JSON(http.StatusOK, AuthTokenResponse{
		Token: token,
		User:  user,
	})
}

func Login(c *gin.Context) {
	var req AuthLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, user, err := services.Login(services.AuthLoginRequest{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, AuthTokenResponse{
		Token: token,
		User:  user,
	})
}

func Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := services.Me(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	c.JSON(http.StatusOK, AuthMeResponse{
		User: user,
	})
}
