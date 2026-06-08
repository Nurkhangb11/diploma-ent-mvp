package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/i18n"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"diploma-ent-mvp/internal/services"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AnswerRequest struct {
	UserID     uint   `json:"user_id" binding:"required"`
	QuestionID uint   `json:"question_id" binding:"required"`
	UserAnswer string `json:"user_answer" binding:"required"`
	Lang       string `json:"lang"`
}

type AnswerResponse struct {
	Correct       bool   `json:"correct"`
	CorrectAnswer string `json:"correct_answer"`
	Explanation   string `json:"explanation"`
}

func SubmitAnswer(c *gin.Context) {
	var req AnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	loc := locale.Normalize(req.Lang)
	if loc == locale.RU && req.Lang == "" {
		loc = locale.Parse(c)
	}

	var user models.User
	if err := database.DB.First(&user, req.UserID).Error; err != nil {
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

	var question models.Question
	if err := database.DB.First(&question, req.QuestionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
		return
	}

	content := services.EnsureQuestionLocale(&question, loc)
	correct := i18n.IsAnswerCorrect(&question, content, req.UserAnswer)

	attempt := models.Attempt{
		UserID:     req.UserID,
		QuestionID: req.QuestionID,
		UserAnswer: strings.TrimSpace(req.UserAnswer),
		Correct:    correct,
	}

	if err := database.DB.Create(&attempt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attempt"})
		return
	}

	c.JSON(http.StatusOK, AnswerResponse{
		Correct:       correct,
		CorrectAnswer: i18n.LocalizedCorrectAnswer(&question, content),
		Explanation:   content.Explanation,
	})
}
