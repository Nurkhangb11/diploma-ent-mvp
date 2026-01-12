package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type WrongQuestion struct {
	QuestionID   uint     `json:"question_id"`
	QuestionText string   `json:"question_text"`
	Options      []string `json:"options"`
	CorrectAnswer string  `json:"correct_answer"`
	Explanation  string   `json:"explanation"`
}

type ProgressResponse struct {
	TotalQuestions int            `json:"total_questions"`
	CorrectAnswers int            `json:"correct_answers"`
	Percentage     float64        `json:"percentage"`
	WrongQuestions []WrongQuestion `json:"wrong_questions"`
}

func GetProgress(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	// Check if user exists
	var user models.User
	if err := database.DB.First(&user, uint(userID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get all attempts for user
	var attempts []models.Attempt
	if err := database.DB.Where("user_id = ?", uint(userID)).Find(&attempts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attempts"})
		return
	}

	totalQuestions := len(attempts)
	correctAnswers := 0
	var wrongQuestions []WrongQuestion

	// Process attempts
	for _, attempt := range attempts {
		if attempt.Correct {
			correctAnswers++
		} else {
			// Get question details for wrong answers
			var question models.Question
			if err := database.DB.First(&question, attempt.QuestionID).Error; err == nil {
				// Parse options JSON string to array
				var options []string
				if err := json.Unmarshal([]byte(question.Options), &options); err != nil {
					options = []string{}
				}

				wrongQuestion := WrongQuestion{
					QuestionID:   question.ID,
					QuestionText: question.QuestionText,
					Options:      options,
					CorrectAnswer: question.CorrectAnswer,
					Explanation:  question.Explanation,
				}
				wrongQuestions = append(wrongQuestions, wrongQuestion)
			}
		}
	}

	// Calculate percentage
	var percentage float64
	if totalQuestions > 0 {
		percentage = float64(correctAnswers) / float64(totalQuestions) * 100
	}

	// Return response
	c.JSON(http.StatusOK, ProgressResponse{
		TotalQuestions: totalQuestions,
		CorrectAnswers: correctAnswers,
		Percentage:     percentage,
		WrongQuestions: wrongQuestions,
	})
}
