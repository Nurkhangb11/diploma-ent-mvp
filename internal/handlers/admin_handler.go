package handlers

import (
	"diploma-ent-mvp/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdminCreateQuestionRequest struct {
	Subject       string   `json:"subject" binding:"required"`
	Topic         string   `json:"topic" binding:"required"`
	QuestionText  string   `json:"question_text" binding:"required"`
	Options       []string `json:"options" binding:"required"`
	CorrectAnswer string   `json:"correct_answer" binding:"required"`
	Explanation   string   `json:"explanation"`
	SubtopicID    *uint    `json:"subtopic_id"`
}

func AdminListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	users, total, err := services.ListUsers(page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func AdminListQuestions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	subject := c.Query("subject")

	questions, total, err := services.ListQuestions(page, limit, subject)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"questions": questions,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

func AdminCreateQuestion(c *gin.Context) {
	var req AdminCreateQuestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	question, err := services.CreateQuestion(services.CreateQuestionRequest{
		Subject:       req.Subject,
		Topic:         req.Topic,
		QuestionText:  req.QuestionText,
		Options:       req.Options,
		CorrectAnswer: req.CorrectAnswer,
		Explanation:   req.Explanation,
		SubtopicID:    req.SubtopicID,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"question": question})
}

func AdminListSubjects(c *gin.Context) {
	subjects, err := services.ListSubjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"subjects": subjects})
}
