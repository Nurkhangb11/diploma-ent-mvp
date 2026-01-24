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
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database migrated successfully")

	// Seed subject structure first (before questions)
	SeedSubjectStructure()

	// Seed questions if table is empty
	SeedQuestions()

	// Seed users
	SeedUsers()
}
