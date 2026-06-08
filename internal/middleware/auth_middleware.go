package middleware

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"diploma-ent-mvp/internal/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const userIDContextKey = "userID"

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing Authorization header"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header"})
			c.Abort()
			return
		}

		userID, err := services.ParseJWT(strings.TrimSpace(parts[1]))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set(userIDContextKey, userID)
		c.Next()
	}
}

func GetUserID(c *gin.Context) uint {
	v, exists := c.Get(userIDContextKey)
	if !exists {
		return 0
	}
	userID, ok := v.(uint)
	if !ok {
		return 0
	}
	return userID
}

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := GetUserID(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		var user models.User
		if err := database.DB.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		if user.Role != models.RoleAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
