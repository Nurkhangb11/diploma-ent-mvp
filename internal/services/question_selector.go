package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"math/rand"
	"strings"
	"sync"
	"time"
)

const (
	repeatErrorProbability = 0.70
	weakPickProbability    = 0.60
	mediumPickProbability  = 0.30
	strongPickProbability  = 0.10
	repeatAfterNQuestions  = 3
)

var seedOnce sync.Once
var randomFloat64 = rand.Float64
var randomIntn = rand.Intn

func seedRand() {
	seedOnce.Do(func() {
		rand.Seed(time.Now().UnixNano())
	})
}

type QuestionSelectionMeta struct {
	Reason               string
	SelectedSubtopicName string
	SubtopicMastery      float64
	QuestionsSinceLast   *int
}

type subtopicStats struct {
	Subtopic  models.Subtopic
	Questions []models.Question
	Mastery   float64
}

// GetAdaptiveQuestion picks the next question for userID, optionally scoped to subject
// (must match models.Question.Subject / subjects in seed, e.g. "История Казахстана").
// If subject is empty, behavior matches the legacy global pool (all subjects).
func GetAdaptiveQuestion(userID uint, subject string) (models.Question, QuestionSelectionMeta, error) {
	seedRand()

	subject = strings.TrimSpace(subject)

	latestAttemptsByQuestionID, questionsSinceLastByQuestionID, err := getLatestAttempts(userID, subject)
	if err != nil {
		return models.Question{}, QuestionSelectionMeta{}, err
	}

	readyRepeatQuestionIDs := getReadyRepeatQuestionIDs(latestAttemptsByQuestionID, questionsSinceLastByQuestionID, repeatAfterNQuestions)
	if len(readyRepeatQuestionIDs) > 0 && randomFloat64() < repeatErrorProbability {
		repeatQuestionID := readyRepeatQuestionIDs[randomIntn(len(readyRepeatQuestionIDs))]
		var question models.Question
		if err := database.DB.First(&question, repeatQuestionID).Error; err != nil {
			return models.Question{}, QuestionSelectionMeta{}, err
		}
		questionsSinceLast := questionsSinceLastByQuestionID[repeatQuestionID]
		return question, QuestionSelectionMeta{
			Reason:             "repeat_error",
			QuestionsSinceLast: &questionsSinceLast,
		}, nil
	}

	question, meta, err := getAdaptiveQuestionByMastery(latestAttemptsByQuestionID, subject)
	if err != nil {
		return models.Question{}, QuestionSelectionMeta{}, err
	}
	return question, meta, nil
}

func getLatestAttempts(userID uint, subject string) (map[uint]models.Attempt, map[uint]int, error) {
	q := database.DB.Where("user_id = ?", userID)
	if subject != "" {
		q = q.Where("question_id IN (?)", database.DB.Model(&models.Question{}).Select("id").Where("subject = ?", subject))
	}
	var attempts []models.Attempt
	if err := q.
		Order("created_at DESC, id DESC").
		Find(&attempts).Error; err != nil {
		return nil, nil, err
	}

	latestAttemptsByQuestionID := make(map[uint]models.Attempt)
	questionsSinceLastByQuestionID := make(map[uint]int)
	for idx, attempt := range attempts {
		if _, exists := latestAttemptsByQuestionID[attempt.QuestionID]; exists {
			continue
		}
		latestAttemptsByQuestionID[attempt.QuestionID] = attempt
		questionsSinceLastByQuestionID[attempt.QuestionID] = idx
	}

	return latestAttemptsByQuestionID, questionsSinceLastByQuestionID, nil
}

func getReadyRepeatQuestionIDs(latestAttemptsByQuestionID map[uint]models.Attempt, questionsSinceLastByQuestionID map[uint]int, cooldown int) []uint {
	ready := make([]uint, 0)
	for questionID, attempt := range latestAttemptsByQuestionID {
		if attempt.Correct {
			continue
		}
		if questionsSinceLastByQuestionID[questionID] >= cooldown {
			ready = append(ready, questionID)
		}
	}
	return ready
}

func getAdaptiveQuestionByMastery(latestAttemptsByQuestionID map[uint]models.Attempt, subject string) (models.Question, QuestionSelectionMeta, error) {
	q := database.DB.Model(&models.Subtopic{}).
		Where("id IN (SELECT DISTINCT subtopic_id FROM questions WHERE subtopic_id IS NOT NULL)")
	if subject != "" {
		q = q.Where("id IN (SELECT DISTINCT subtopic_id FROM questions WHERE subtopic_id IS NOT NULL AND subject = ?)", subject)
	}
	var subtopics []models.Subtopic
	if err := q.Find(&subtopics).Error; err != nil {
		return models.Question{}, QuestionSelectionMeta{}, err
	}

	if len(subtopics) == 0 {
		question, err := getRandomQuestion(subject)
		if err != nil {
			return models.Question{}, QuestionSelectionMeta{}, err
		}
		return question, QuestionSelectionMeta{}, nil
	}

	statsBySubtopicID := make(map[uint]subtopicStats, len(subtopics))
	weak := make([]uint, 0)
	medium := make([]uint, 0)
	strong := make([]uint, 0)

	for _, subtopic := range subtopics {
		qq := database.DB.Where("subtopic_id = ?", subtopic.ID)
		if subject != "" {
			qq = qq.Where("subject = ?", subject)
		}
		var questions []models.Question
		if err := qq.Find(&questions).Error; err != nil {
			return models.Question{}, QuestionSelectionMeta{}, err
		}
		if len(questions) == 0 {
			continue
		}

		correctCount := 0
		for _, question := range questions {
			latestAttempt, exists := latestAttemptsByQuestionID[question.ID]
			if exists && latestAttempt.Correct {
				correctCount++
			}
		}

		mastery := float64(correctCount) / float64(len(questions))
		statsBySubtopicID[subtopic.ID] = subtopicStats{
			Subtopic:  subtopic,
			Questions: questions,
			Mastery:   mastery,
		}

		if mastery < 0.4 {
			weak = append(weak, subtopic.ID)
		} else if mastery <= 0.7 {
			medium = append(medium, subtopic.ID)
		} else {
			strong = append(strong, subtopic.ID)
		}
	}

	selectedReason, selectedSubtopicID := pickSubtopicWithFallback(weak, medium, strong)
	if selectedSubtopicID == 0 {
		question, err := getRandomQuestion(subject)
		if err != nil {
			return models.Question{}, QuestionSelectionMeta{}, err
		}
		return question, QuestionSelectionMeta{}, nil
	}

	stats := statsBySubtopicID[selectedSubtopicID]
	question := stats.Questions[randomIntn(len(stats.Questions))]
	return question, QuestionSelectionMeta{
		Reason:               selectedReason,
		SelectedSubtopicName: stats.Subtopic.Name,
		SubtopicMastery:      stats.Mastery,
	}, nil
}

func pickSubtopicWithFallback(weak, medium, strong []uint) (string, uint) {
	candidates := make([]struct {
		reason string
		weight float64
		items  []uint
	}, 0, 3)

	if len(weak) > 0 {
		candidates = append(candidates, struct {
			reason string
			weight float64
			items  []uint
		}{reason: "weak_topic", weight: weakPickProbability, items: weak})
	}
	if len(medium) > 0 {
		candidates = append(candidates, struct {
			reason string
			weight float64
			items  []uint
		}{reason: "medium_topic", weight: mediumPickProbability, items: medium})
	}
	if len(strong) > 0 {
		candidates = append(candidates, struct {
			reason string
			weight float64
			items  []uint
		}{reason: "strong_topic", weight: strongPickProbability, items: strong})
	}

	if len(candidates) == 0 {
		return "", 0
	}

	totalWeight := 0.0
	for _, candidate := range candidates {
		totalWeight += candidate.weight
	}

	r := randomFloat64() * totalWeight
	running := 0.0
	for _, candidate := range candidates {
		running += candidate.weight
		if r <= running {
			return candidate.reason, candidate.items[randomIntn(len(candidate.items))]
		}
	}

	last := candidates[len(candidates)-1]
	return last.reason, last.items[randomIntn(len(last.items))]
}

func getRandomQuestion(subject string) (models.Question, error) {
	q := database.DB.Order("RANDOM()")
	if subject != "" {
		q = q.Where("subject = ?", subject)
	}
	var question models.Question
	if err := q.First(&question).Error; err != nil {
		return models.Question{}, err
	}
	return question, nil
}
