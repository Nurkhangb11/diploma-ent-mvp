package database

import (
	"diploma-ent-mvp/internal/models"
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open("ent.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")

	// Auto migrate
	err = DB.AutoMigrate(
		&models.User{},
		&models.Subject{},
		&models.Section{},
		&models.Subtopic{},
		&models.Question{},
		&models.Attempt{},
		&models.WeeklyAIPlan{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migrated successfully")

	// Flat questions first so *_kz.json refs can attach subtopic_id to existing rows.
	SeedQuestions()

	// Subject → Section → Subtopic (+ embedded questions or id refs)
	SeedSubjectStructure()

	// Seed users
	SeedUsers()

	// Demo account for product showcase (after questions + subjects exist)
	SeedDemoUser()

	SyncSubjectENTMaxScores()
}
