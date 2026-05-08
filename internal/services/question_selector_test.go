package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"fmt"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupSelectorTestDB(t *testing.T) {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Subject{},
		&models.Section{},
		&models.Subtopic{},
		&models.Question{},
		&models.Attempt{},
	); err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}

	database.DB = db
}

func seedBaseQuestions(t *testing.T) []models.Question {
	t.Helper()

	subject := models.Subject{Name: "S", MaxScore: 100}
	if err := database.DB.Create(&subject).Error; err != nil {
		t.Fatalf("create subject: %v", err)
	}
	section := models.Section{SubjectID: subject.ID, Name: "Sec", Weight: 1}
	if err := database.DB.Create(&section).Error; err != nil {
		t.Fatalf("create section: %v", err)
	}
	subtopic := models.Subtopic{SectionID: section.ID, Name: "Sub"}
	if err := database.DB.Create(&subtopic).Error; err != nil {
		t.Fatalf("create subtopic: %v", err)
	}

	makeQ := func(idx int) models.Question {
		return models.Question{
			Subject:       "S",
			Topic:         "T",
			QuestionText:  fmt.Sprintf("q-%d", idx),
			Options:       `["A","B"]`,
			CorrectAnswer: "A",
			Explanation:   "",
			SubtopicID:    &subtopic.ID,
		}
	}

	questions := []models.Question{makeQ(1), makeQ(2), makeQ(3), makeQ(4)}
	if err := database.DB.Create(&questions).Error; err != nil {
		t.Fatalf("create questions: %v", err)
	}
	return questions
}

func TestRepeatRespectsCooldown(t *testing.T) {
	setupSelectorTestDB(t)
	questions := seedBaseQuestions(t)

	origFloat := randomFloat64
	origIntn := randomIntn
	randomFloat64 = func() float64 { return 0.0 }
	randomIntn = func(n int) int { return 0 }
	defer func() {
		randomFloat64 = origFloat
		randomIntn = origIntn
	}()

	userID := uint(10)
	now := time.Now()
	attempts := []models.Attempt{
		{UserID: userID, QuestionID: questions[0].ID, UserAnswer: "B", Correct: false, CreatedAt: now.Add(-4 * time.Minute)},
		{UserID: userID, QuestionID: questions[1].ID, UserAnswer: "A", Correct: true, CreatedAt: now.Add(-3 * time.Minute)},
		{UserID: userID, QuestionID: questions[2].ID, UserAnswer: "A", Correct: true, CreatedAt: now.Add(-2 * time.Minute)},
	}
	if err := database.DB.Create(&attempts).Error; err != nil {
		t.Fatalf("create attempts: %v", err)
	}

	_, meta, err := GetAdaptiveQuestion(userID)
	if err != nil {
		t.Fatalf("GetAdaptiveQuestion failed: %v", err)
	}

	if meta.Reason == "repeat_error" {
		t.Fatalf("repeat_error returned before cooldown")
	}
}

func TestRepeatProbabilityApproximatelySeventyPercent(t *testing.T) {
	setupSelectorTestDB(t)
	questions := seedBaseQuestions(t)

	origIntn := randomIntn
	randomIntn = func(n int) int { return 0 }
	defer func() {
		randomIntn = origIntn
	}()

	userID := uint(11)
	now := time.Now()
	attempts := []models.Attempt{
		{UserID: userID, QuestionID: questions[0].ID, UserAnswer: "B", Correct: false, CreatedAt: now.Add(-5 * time.Minute)},
		{UserID: userID, QuestionID: questions[1].ID, UserAnswer: "A", Correct: true, CreatedAt: now.Add(-4 * time.Minute)},
		{UserID: userID, QuestionID: questions[2].ID, UserAnswer: "A", Correct: true, CreatedAt: now.Add(-3 * time.Minute)},
		{UserID: userID, QuestionID: questions[3].ID, UserAnswer: "A", Correct: true, CreatedAt: now.Add(-2 * time.Minute)},
	}
	if err := database.DB.Create(&attempts).Error; err != nil {
		t.Fatalf("create attempts: %v", err)
	}

	total := 1000
	repeatCount := 0
	for i := 0; i < total; i++ {
		_, meta, err := GetAdaptiveQuestion(userID)
		if err != nil {
			t.Fatalf("GetAdaptiveQuestion failed: %v", err)
		}
		if meta.Reason == "repeat_error" {
			repeatCount++
		}
	}

	ratio := float64(repeatCount) / float64(total)
	if ratio < 0.62 || ratio > 0.78 {
		t.Fatalf("repeat_error ratio out of expected range: %.3f", ratio)
	}
}
