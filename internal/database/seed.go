package database

import (
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"log"
	"os"
)

type QuestionJSON struct {
	Subject       string   `json:"subject"`
	Topic         string   `json:"topic"`
	QuestionText  string   `json:"questionText"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correctAnswer"`
	Explanation   string   `json:"explanation"`
}

func SeedQuestions() {
	// Check if questions already exist
	var count int64
	DB.Model(&models.Question{}).Count(&count)
	if count > 0 {
		log.Println("Questions already exist in database, skipping seed")
		return
	}

	// Read JSON file
	file, err := os.Open("internal/database/questions.json")
	if err != nil {
		log.Printf("Failed to open questions.json: %v", err)
		return
	}
	defer file.Close()

	// Check if file is empty
	fileInfo, err := file.Stat()
	if err != nil {
		log.Printf("Failed to get file info: %v", err)
		return
	}
	if fileInfo.Size() == 0 {
		log.Println("questions.json is empty, skipping seed")
		return
	}

	var questionsJSON []QuestionJSON
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&questionsJSON); err != nil {
		log.Printf("Failed to decode questions.json: %v", err)
		return
	}

	if len(questionsJSON) == 0 {
		log.Println("No questions found in questions.json, skipping seed")
		return
	}

	log.Printf("Found %d questions in JSON file", len(questionsJSON))

	// Convert and save questions
	for _, qj := range questionsJSON {
		// Convert options array to JSON string
		optionsJSON, err := json.Marshal(qj.Options)
		if err != nil {
			log.Printf("Failed to marshal options for question: %v", err)
			continue
		}

		question := models.Question{
			Subject:       qj.Subject,
			Topic:         qj.Topic,
			QuestionText:  qj.QuestionText,
			Options:       string(optionsJSON),
			CorrectAnswer: qj.CorrectAnswer,
			Explanation:   qj.Explanation,
		}

		if err := DB.Create(&question).Error; err != nil {
			log.Printf("Failed to create question: %v", err)
			continue
		}
	}

	log.Printf("Successfully seeded %d questions", len(questionsJSON))
}

func SeedUsers() {
	// Check if user already exists
	var existingUser models.User
	if err := DB.Where("email = ?", "nurkhan@example.com").First(&existingUser).Error; err == nil {
		log.Println("User Nurkhan already exists, skipping seed")
		return
	}

	// Create user
	user := models.User{
		Name:        "Nurkhan",
		Email:       "nurkhan@example.com",
		TargetScore: 120,
	}

	if err := DB.Create(&user).Error; err != nil {
		log.Printf("Failed to create user: %v", err)
		return
	}

	log.Println("Successfully seeded user: Nurkhan")
}
