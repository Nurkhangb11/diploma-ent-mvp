package database

import (
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"log"
	"os"
	"strings"
)

type SubjectJSON struct {
	Subject    string      `json:"subject"`
	TotalScore int         `json:"totalScore"`
	Topics     []TopicJSON `json:"topics"`
}

type TopicJSON struct {
	Topic     string         `json:"topic"`
	Weight    int            `json:"weight"`
	Subtopics []SubtopicJSON `json:"subtopics"`
}

type SubtopicJSON struct {
	Subtopic  string            `json:"subtopic"`
	Questions []QuestionRefJSON `json:"questions"`
}

type QuestionRefJSON struct {
	ID uint `json:"id"`
}

func SeedSubjectStructure() {
	entries, err := os.ReadDir("internal/database")
	if err != nil {
		log.Printf("Failed to read internal/database directory: %v", err)
		return
	}

	seededAny := false

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, "_kz.json") {
			continue
		}

		fullPath := "internal/database/" + name

		// Decode subject json
		file, err := os.Open(fullPath)
		if err != nil {
			log.Printf("Failed to open %s: %v", name, err)
			continue
		}

		var subjectJSON SubjectJSON
		decoder := json.NewDecoder(file)
		if err := decoder.Decode(&subjectJSON); err != nil {
			_ = file.Close()
			log.Printf("Failed to decode %s: %v", name, err)
			continue
		}
		_ = file.Close()

		if strings.TrimSpace(subjectJSON.Subject) == "" {
			continue
		}

		// If subject already exists, skip seeding from this file.
		var existingSubject models.Subject
		if err := DB.Where("name = ?", subjectJSON.Subject).First(&existingSubject).Error; err == nil {
			continue
		}

		subject := models.Subject{
			Name:     subjectJSON.Subject,
			MaxScore: subjectJSON.TotalScore,
		}
		if err := DB.Create(&subject).Error; err != nil {
			log.Printf("Failed to create subject from %s: %v", name, err)
			continue
		}
		log.Printf("Created subject: %s (max_score: %d)", subject.Name, subject.MaxScore)

		// Create sections and subtopics
		for _, topicJSON := range subjectJSON.Topics {
			section := models.Section{
				SubjectID: subject.ID,
				Name:      topicJSON.Topic,
				Weight:    topicJSON.Weight,
			}
			if err := DB.Create(&section).Error; err != nil {
				log.Printf("Failed to create section: %v", err)
				continue
			}

			for _, subtopicJSON := range topicJSON.Subtopics {
				subtopic := models.Subtopic{
					SectionID: section.ID,
					Name:      subtopicJSON.Subtopic,
				}
				if err := DB.Create(&subtopic).Error; err != nil {
					log.Printf("Failed to create subtopic: %v", err)
					continue
				}

				// Update questions with subtopic_id
				for _, questionRef := range subtopicJSON.Questions {
					if err := DB.Model(&models.Question{}).
						Where("id = ?", questionRef.ID).
						Update("subtopic_id", subtopic.ID).Error; err != nil {
						log.Printf("Failed to update question %d with subtopic_id: %v", questionRef.ID, err)
					}
				}
			}
		}

		seededAny = true
	}

	if !seededAny {
		log.Println("No *_kz.json subject structure files found or nothing to seed")
	}
}
