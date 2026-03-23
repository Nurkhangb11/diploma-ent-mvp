package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AnswerRequest struct {
	UserID     uint   `json:"user_id" binding:"required"`
	QuestionID uint   `json:"question_id" binding:"required"`
	UserAnswer string `json:"user_answer" binding:"required"`
}

type AnswerResponse struct {
	Correct      bool   `json:"correct"`
	CorrectAnswer string `json:"correct_answer"`
	Explanation  string `json:"explanation"`
}

func SubmitAnswer(c *gin.Context) {
	var req AnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user exists, create if not
	var user models.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
		// User doesn't exist, create a new one with unique email
		user = models.User{
			ID:          req.UserID,
			Name:        "User",
			Email:       fmt.Sprintf("user%d@example.com", req.UserID),
			TargetScore: 0,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	}

	// Get question
	var question models.Question
	if err := database.DB.First(&question, req.QuestionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
		return
	}

	// Check if answer is correct (trim whitespace and compare)
	correct := strings.TrimSpace(question.CorrectAnswer) == strings.TrimSpace(req.UserAnswer)

	// Create attempt record
	attempt := models.Attempt{
		UserID:     req.UserID,
		QuestionID: req.QuestionID,
		UserAnswer: req.UserAnswer,
		Correct:    correct,
	}

	if err := database.DB.Create(&attempt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attempt"})
		return
	}

	c.JSON(http.StatusOK, AnswerResponse{
		Correct:       correct,
		CorrectAnswer: question.CorrectAnswer,
		Explanation:   question.Explanation,
	})
}

