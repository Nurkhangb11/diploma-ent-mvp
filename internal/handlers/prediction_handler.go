package handlers

import (
	"diploma-ent-mvp/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetPrediction(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	// Получить название предмета из query параметра (по умолчанию "История Казахстана")
	subjectName := c.DefaultQuery("subject", "История Казахстана")

	// Рассчитать прогноз
	result, err := services.CalculatePrediction(uint(userID), subjectName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate prediction"})
		return
	}

	c.JSON(http.StatusOK, result)
}


