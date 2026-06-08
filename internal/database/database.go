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

	// Backfill locale for weekly plans created before i18n.
	if DB.Migrator().HasTable(&models.WeeklyAIPlan{}) && DB.Migrator().HasColumn(&models.WeeklyAIPlan{}, "Locale") {
		if err := DB.Model(&models.WeeklyAIPlan{}).
			Where("locale IS NULL OR locale = ''").
			Update("locale", "ru").Error; err != nil {
			log.Printf("Weekly plan locale backfill skipped: %v", err)
		}
	}

	// Flat questions first so *_kz.json refs can attach subtopic_id to existing rows.
	SeedQuestions()

	// Subject → Section → Subtopic (+ embedded questions or id refs)
	SeedSubjectStructure()

	// Seed users
	SeedUsers()

	// Demo account for product showcase (after questions + subjects exist)
	SeedDemoUser()

	SyncSubjectENTMaxScores()

	BackfillQuestionI18n()
	BackfillCurriculumI18n()
}
