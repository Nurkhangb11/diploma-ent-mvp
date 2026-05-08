package handlers

import (
	"diploma-ent-mvp/internal/middleware"
	"diploma-ent-mvp/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ProfileResponse struct {
	User services.UserDTO `json:"user"`
}

type ProfileUpdateRequest struct {
	Name        string `json:"name"`
	Avatar      string `json:"avatar"`
	TargetScore int    `json:"target_score"`
}

func GetProfile(c *gin.Context) {
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

	c.JSON(http.StatusOK, ProfileResponse{User: user})
}

func PutProfile(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req ProfileUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := services.UpdateProfile(userID, req.Name, req.Avatar, req.TargetScore)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ProfileResponse{User: user})
}
