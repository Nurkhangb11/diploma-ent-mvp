package handlers

import (
	"diploma-ent-mvp/internal/locale"
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

	subjectName := c.DefaultQuery("subject", "История Казахстана")
	loc := locale.Parse(c)

	result, err := services.CalculatePrediction(uint(userID), subjectName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate prediction"})
		return
	}

	result.Message = locale.FormatPredictionMessage(result.ConfidenceLevel, loc)
	for i := range result.SectionScores {
		result.SectionScores[i].SectionName = locale.TranslateTopicName(result.SectionScores[i].SectionName, loc)
	}

	c.JSON(http.StatusOK, result)
}
