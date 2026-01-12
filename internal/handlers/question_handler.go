package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

type QuestionResponse struct {
	ID           uint   `json:"id"`
	Subject      string `json:"subject"`
	Topic        string `json:"topic"`
	QuestionText string `json:"question_text"`
	Options      string `json:"options"`
}

func GetRandomQuestion(c *gin.Context) {
	var question models.Question

	// Get random question from database
	err := database.DB.Order("RANDOM()").First(&question).Error
	if err != nil {
		// If no questions found, return empty array
		c.JSON(http.StatusOK, []QuestionResponse{})
		return
	}

	// Return question without correct_answer and explanation
	response := QuestionResponse{
		ID:           question.ID,
		Subject:      question.Subject,
		Topic:        question.Topic,
		QuestionText: question.QuestionText,
		Options:      question.Options,
	}

	c.JSON(http.StatusOK, []QuestionResponse{response})
}
