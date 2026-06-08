package database

import (
	"diploma-ent-mvp/internal/models"
	"errors"
	"log"
	"os"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const demoUserEmail = "demo@example.com"

// SeedDemoUser creates a showcase account with attempts across subjects (idempotent).
func SeedDemoUser() {
	pwd := os.Getenv("DEMO_USER_PASSWORD")
	if pwd == "" {
		pwd = "demo12345"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("demo seed: bcrypt: %v", err)
		return
	}

	var u models.User
	err = DB.Where("email = ?", demoUserEmail).First(&u).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("demo seed: lookup user: %v", err)
			return
		}
		u = models.User{
			Name:         "Demo",
			Email:        demoUserEmail,
			TargetScore:  120,
			PasswordHash: string(hash),
			Avatar:       "",
		}
		if err := DB.Create(&u).Error; err != nil {
			log.Printf("demo seed: create user: %v", err)
			return
		}
		log.Printf("Created demo user %s (password from DEMO_USER_PASSWORD or default)", demoUserEmail)
	}

	var attemptCount int64
	DB.Model(&models.Attempt{}).Where("user_id = ?", u.ID).Count(&attemptCount)
	if attemptCount >= 40 {
		return
	}
	if attemptCount > 0 {
		// Partial seed from older run — skip to avoid duplicates
		return
	}

	loc := time.FixedZone("Asia/Almaty", 5*3600)
	now := time.Now().In(loc)
	subjects := []string{"История Казахстана", "Математическая грамотность", "Грамотность чтения"}

	for si, sub := range subjects {
		var qs []models.Question
		if err := DB.Where("subject = ? AND subtopic_id IS NOT NULL", sub).Order("id ASC").Limit(40).Find(&qs).Error; err != nil || len(qs) == 0 {
			continue
		}
		for i, q := range qs {
			correct := (i+si)%4 != 0
			ua := q.CorrectAnswer
			if !correct {
				ua = "___"
			}
			day := (i % 16) + (si * 2)
			at := now.AddDate(0, 0, -day).Add(time.Duration(i) * time.Minute)
			a := models.Attempt{
				UserID:     u.ID,
				QuestionID: q.ID,
				UserAnswer: ua,
				Correct:    correct,
				CreatedAt:  at,
			}
			if err := DB.Create(&a).Error; err != nil {
				log.Printf("demo seed attempt: %v", err)
			}
		}
	}

	log.Println("Seeded demo user attempts for dashboard / streak / analytics")
}
