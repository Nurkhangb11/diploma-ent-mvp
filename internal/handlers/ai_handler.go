package handlers

import (
	"diploma-ent-mvp/internal/services"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type AIFeedbackRequest struct {
	Question      string `json:"question" binding:"required"`
	CorrectAnswer string `json:"correct_answer" binding:"required"`
	UserAnswer    string `json:"user_answer" binding:"required"`
	Explanation   string `json:"explanation"`
}

type AIFeedbackResponse struct {
	AIFeedback string `json:"ai_feedback"`
}

type AIChatRequest struct {
	Message string `json:"message" binding:"required"`
	Context struct {
		Question      string `json:"question"`
		CorrectAnswer string `json:"correct_answer"`
		UserAnswer    string `json:"user_answer"`
	} `json:"context"`
}

type AIChatResponse struct {
	Reply string `json:"reply"`
}

func GetAIFeedback(c *gin.Context) {
	var req AIFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feedback, err := services.GenerateAIFeedback(req.Question, req.CorrectAnswer, req.UserAnswer, req.Explanation)
	if err != nil {
		if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI is not configured: OPENAI_API_KEY is missing"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate AI feedback"})
		return
	}

	c.JSON(http.StatusOK, AIFeedbackResponse{
		AIFeedback: strings.TrimSpace(feedback),
	})
}

func ChatWithAI(c *gin.Context) {
	var req AIChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	reply, err := services.GenerateAIChatReply(
		req.Message,
		req.Context.Question,
		req.Context.CorrectAnswer,
		req.Context.UserAnswer,
	)
	if err != nil {
		if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI is not configured: OPENAI_API_KEY is missing"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate AI reply"})
		return
	}

	c.JSON(http.StatusOK, AIChatResponse{
		Reply: strings.TrimSpace(reply),
	})
}
