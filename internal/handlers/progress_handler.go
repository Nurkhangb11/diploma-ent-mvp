package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/i18n"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"diploma-ent-mvp/internal/services"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WrongQuestion struct {
	QuestionID    uint     `json:"question_id"`
	QuestionText  string   `json:"question_text"`
	Topic         string   `json:"topic"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Explanation   string   `json:"explanation"`
}

type ProgressResponse struct {
	TotalQuestions int             `json:"total_questions"`
	CorrectAnswers int             `json:"correct_answers"`
	Percentage     float64         `json:"percentage"`
	WrongQuestions []WrongQuestion `json:"wrong_questions"`
}

func GetProgress(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	loc := locale.Parse(c)

	var user models.User
	if err := database.DB.First(&user, uint(userID)).Error; err != nil {
		user = models.User{
			ID:          uint(userID),
			Name:        "User",
			Email:       fmt.Sprintf("user%d@example.com", userID),
			TargetScore: 0,
		}
		if err := database.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	}

	var attempts []models.Attempt
	if err := database.DB.Where("user_id = ?", uint(userID)).Find(&attempts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attempts"})
		return
	}

	totalQuestions := len(attempts)
	correctAnswers := 0
	var wrongQuestions []WrongQuestion

	for _, attempt := range attempts {
		if attempt.Correct {
			correctAnswers++
		} else {
			var question models.Question
			if err := database.DB.First(&question, attempt.QuestionID).Error; err == nil {
				content := services.CachedQuestionLocale(&question, loc)
				localized := i18n.ApplyContent(&question, content, loc)

				wrongQuestion := WrongQuestion{
					QuestionID:    question.ID,
					QuestionText:  localized.QuestionText,
					Topic:         locale.TranslateTopicName(localized.Topic, loc),
					Options:       content.Options,
					CorrectAnswer: i18n.LocalizedCorrectAnswer(&question, content),
					Explanation:   localized.Explanation,
				}
				wrongQuestions = append(wrongQuestions, wrongQuestion)
			}
		}
	}

	var percentage float64
	if totalQuestions > 0 {
		percentage = float64(correctAnswers) / float64(totalQuestions) * 100
	}

	c.JSON(http.StatusOK, ProgressResponse{
		TotalQuestions: totalQuestions,
		CorrectAnswers: correctAnswers,
		Percentage:     percentage,
		WrongQuestions: wrongQuestions,
	})
}
