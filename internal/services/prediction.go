package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"math"
)

const (
	// Порог для расчета доверия (количество попыток)
	ConfidenceThreshold = 20
)

// PredictionResult содержит результат прогноза баллов
type PredictionResult struct {
	PredictedScore float64 `json:"predicted_score"`
	Confidence     float64 `json:"confidence"`
	ConfidenceLevel string `json:"confidence_level"` // "low", "medium", "high"
	Message        string  `json:"message"`
	SectionScores []SectionScore `json:"section_scores"`
}

// SectionScore содержит балл за конкретную тему
type SectionScore struct {
	SectionName string  `json:"section_name"`
	Weight      int     `json:"weight"`
	Mastery    float64 `json:"mastery"`
	Score      float64 `json:"score"`
}

// CalculatePrediction рассчитывает прогнозируемый балл для пользователя по предмету
func CalculatePrediction(userID uint, subjectName string) (*PredictionResult, error) {
	// Получить предмет
	var subject models.Subject
	if err := database.DB.Where("name = ?", subjectName).First(&subject).Error; err != nil {
		return nil, err
	}

	// Получить все секции предмета
	var sections []models.Section
	if err := database.DB.Where("subject_id = ?", subject.ID).Find(&sections).Error; err != nil {
		return nil, err
	}

	var totalPredictedScore float64
	var sectionScores []SectionScore
	totalAttempts := 0

	// Рассчитать балл для каждой секции
	for _, section := range sections {
		// Получить все подтемы секции
		var subtopics []models.Subtopic
		if err := database.DB.Where("section_id = ?", section.ID).Find(&subtopics).Error; err != nil {
			continue
		}

		var subtopicMasteries []float64

		// Рассчитать освоенность каждой подтемы
		for _, subtopic := range subtopics {
			// Получить все вопросы подтемы
			var questions []models.Question
			if err := database.DB.Where("subtopic_id = ?", subtopic.ID).Find(&questions).Error; err != nil {
				continue
			}

			if len(questions) == 0 {
				continue
			}

			// Подсчитать правильные ответы пользователя по этой подтеме
			// Для каждого вопроса берем последнюю попытку (самую актуальную)
			var correctCount int
			var totalQuestionsAnswered int

			for _, question := range questions {
				var lastAttempt models.Attempt
				// Получить последнюю попытку пользователя по этому вопросу
				if err := database.DB.Where("user_id = ? AND question_id = ?", userID, question.ID).
					Order("created_at DESC").
					First(&lastAttempt).Error; err == nil {
					totalQuestionsAnswered++
					totalAttempts++
					if lastAttempt.Correct {
						correctCount++
					}
				}
			}

			// Освоенность подтемы = количество_правильных / всего_вопросов_в_подтеме
			// Если пользователь не ответил на все вопросы, считаем только по тем, на которые ответил
			var mastery float64
			if len(questions) > 0 {
				// Используем общее количество вопросов в подтеме для расчета
				mastery = float64(correctCount) / float64(len(questions))
			}
			subtopicMasteries = append(subtopicMasteries, mastery)
		}

		// Освоенность темы = (сумма освоенностей подтем) / количество подтем
		var sectionMastery float64
		if len(subtopicMasteries) > 0 {
			var sum float64
			for _, m := range subtopicMasteries {
				sum += m
			}
			sectionMastery = sum / float64(len(subtopicMasteries))
		}

		// Балл за тему = вес_темы × освоенность_темы
		sectionScore := float64(section.Weight) * sectionMastery
		totalPredictedScore += sectionScore

		sectionScores = append(sectionScores, SectionScore{
			SectionName: section.Name,
			Weight:      section.Weight,
			Mastery:     sectionMastery,
			Score:       sectionScore,
		})
	}

	// Рассчитать доверие
	confidence := calculateConfidence(totalAttempts)
	confidenceLevel := getConfidenceLevel(confidence)

	// Формировать сообщение
	message := formatMessage(totalPredictedScore, confidence, confidenceLevel)

	return &PredictionResult{
		PredictedScore: math.Round(totalPredictedScore*10) / 10, // Округление до 1 знака
		Confidence:     confidence,
		ConfidenceLevel: confidenceLevel,
		Message:        message,
		SectionScores:  sectionScores,
	}, nil
}

// calculateConfidence рассчитывает уровень доверия к прогнозу
func calculateConfidence(attempts int) float64 {
	if attempts == 0 {
		return 0.0
	}
	confidence := float64(attempts) / float64(ConfidenceThreshold)
	if confidence > 1.0 {
		confidence = 1.0
	}
	return confidence
}

// getConfidenceLevel определяет уровень доверия
func getConfidenceLevel(confidence float64) string {
	if confidence < 0.5 {
		return "low"
	} else if confidence < 1.0 {
		return "medium"
	}
	return "high"
}

// formatMessage формирует сообщение с прогнозом
func formatMessage(score, confidence float64, level string) string {
	if level == "low" {
		return "⚠️ Низкая точность прогноза. Рекомендуется ответить на больше вопросов для более точной оценки."
	}

	// Рассчитать погрешность (±)
	errorMargin := (1.0 - confidence) * 2.0 // Максимальная погрешность 2 балла при низком доверии
	if errorMargin < 0.5 {
		errorMargin = 0.5
	}

	if level == "high" {
		return "✅ Высокая точность прогноза."
	}

	return "ℹ️ Средняя точность прогноза."
}

