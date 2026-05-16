package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"diploma-ent-mvp/internal/services"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetWeeklyAIPlan returns a cached weekly study plan or generates a new one.
// GET /api/ai/weekly-plan/:user_id?subject=...&force=true
func GetWeeklyAIPlan(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID64, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}
	userID := uint(userID64)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	subject := c.DefaultQuery("subject", dashboardDefaultSubject)
	force := c.Query("force") == "true" || c.Query("force") == "1"

	plan, err := services.GetWeeklyStudyPlan(userID, subject, force)
	if err != nil {
		if errors.Is(err, services.ErrWeeklyPlanUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, plan)
}
