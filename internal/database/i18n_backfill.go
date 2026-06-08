package database

import (
	"diploma-ent-mvp/internal/i18n"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"log"
	"strings"
)

// BackfillQuestionI18n populates Russian i18n content and answer indices for existing questions.
func BackfillQuestionI18n() {
	var questions []models.Question
	if err := DB.Find(&questions).Error; err != nil {
		log.Printf("BackfillQuestionI18n: failed to load questions: %v", err)
		return
	}

	updated := 0
	for i := range questions {
		q := &questions[i]
		m := i18n.EnsureQuestionRU(q)
		ru := m[locale.RU]

		needsUpdate := strings.TrimSpace(q.ContentI18n) == ""
		if q.CorrectAnswerIndex == nil {
			if idx := i18n.ComputeCorrectAnswerIndex(ru.Options, ru.CorrectAnswer); idx != nil {
				q.CorrectAnswerIndex = idx
				needsUpdate = true
			}
		}

		if needsUpdate {
			if b, err := json.Marshal(m); err == nil {
				q.ContentI18n = string(b)
			}
			if err := DB.Model(q).Updates(map[string]interface{}{
				"content_i18n":         q.ContentI18n,
				"correct_answer_index": q.CorrectAnswerIndex,
			}).Error; err != nil {
				log.Printf("BackfillQuestionI18n: update question %d: %v", q.ID, err)
				continue
			}
			updated++
		}
	}

	if updated > 0 {
		log.Printf("BackfillQuestionI18n: updated %d questions", updated)
	}
}
