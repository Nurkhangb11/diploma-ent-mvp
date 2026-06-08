package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"diploma-ent-mvp/internal/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type QuestionResponse struct {
	ID                   uint     `json:"id"`
	Subject              string   `json:"subject"`
	Topic                string   `json:"topic"`
	QuestionText         string   `json:"question_text"`
	Options              string   `json:"options"`
	SelectedSubtopicName string   `json:"selected_subtopic_name,omitempty"`
	SubtopicMastery      *float64 `json:"subtopic_mastery,omitempty"`
	QuestionsSinceLast   *int     `json:"questions_since_last,omitempty"`
	Reason               string   `json:"reason,omitempty"`
}

func GetRandomQuestion(c *gin.Context) {
	userIDStr := c.Query("user_id")
	subject := strings.TrimSpace(c.Query("subject"))
	loc := locale.Parse(c)

	var question models.Question
	var meta services.QuestionSelectionMeta
	var err error

	// If user_id not passed -> keep current behavior (random question).
	if userIDStr == "" {
		q := database.DB.Order("RANDOM()")
		if subject != "" {
			q = q.Where("subject = ?", subject)
		}
		err = q.First(&question).Error
		if err != nil {
			// If no questions found, return empty array
			c.JSON(http.StatusOK, []QuestionResponse{})
			return
		}
	} else {
		// Adaptive question selection.
		userID64, parseErr := strconv.ParseUint(userIDStr, 10, 32)
		if parseErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
			return
		}

		question, meta, err = services.GetAdaptiveQuestion(uint(userID64), subject)
		if err != nil {
			c.JSON(http.StatusOK, []QuestionResponse{})
			return
		}
	}

	// Return question without correct_answer and explanation
	localized := services.LocalizeQuestion(&question, loc)
	response := QuestionResponse{
		ID:                   localized.ID,
		Subject:              locale.TranslateSubjectName(localized.Subject, loc),
		Topic:                locale.TranslateTopicName(localized.Topic, loc),
		QuestionText:         localized.QuestionText,
		Options:              localized.Options,
		SelectedSubtopicName: locale.TranslateTopicName(meta.SelectedSubtopicName, loc),
		QuestionsSinceLast:   meta.QuestionsSinceLast,
		Reason:               meta.Reason,
	}
	if meta.SelectedSubtopicName != "" {
		mastery := meta.SubtopicMastery
		response.SubtopicMastery = &mastery
	}

	c.JSON(http.StatusOK, []QuestionResponse{response})
}
