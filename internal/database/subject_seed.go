package database

import (
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"log"
	"os"
)

type SubjectJSON struct {
	Subject   string       `json:"subject"`
	TotalScore int         `json:"totalScore"`
	Topics    []TopicJSON  `json:"topics"`
}

type TopicJSON struct {
	Topic     string         `json:"topic"`
	Weight    int            `json:"weight"`
	Subtopics []SubtopicJSON `json:"subtopics"`
}

type SubtopicJSON struct {
	Subtopic  string           `json:"subtopic"`
	Questions []QuestionRefJSON `json:"questions"`
}

type QuestionRefJSON struct {
	ID uint `json:"id"`
}

func SeedSubjectStructure() {
	// Check if subject already exists
	var existingSubject models.Subject
	if err := DB.Where("name = ?", "История Казахстана").First(&existingSubject).Error; err == nil {
		log.Println("Subject structure already exists, skipping seed")
		return
	}

	// Read JSON file
	file, err := os.Open("internal/database/history_kz.json")
	if err != nil {
		log.Printf("Failed to open history_kz.json: %v", err)
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
		log.Println("history_kz.json is empty, skipping seed")
		return
	}

	var subjectJSON SubjectJSON
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&subjectJSON); err != nil {
		log.Printf("Failed to decode history_kz.json: %v", err)
		return
	}

	// Create subject
	subject := models.Subject{
		Name:     subjectJSON.Subject,
		MaxScore: subjectJSON.TotalScore,
	}
	if err := DB.Create(&subject).Error; err != nil {
		log.Printf("Failed to create subject: %v", err)
		return
	}
	log.Printf("Created subject: %s (max_score: %d)", subject.Name, subject.MaxScore)

	// Create sections and subtopics
	for _, topicJSON := range subjectJSON.Topics {
		// Create section
		section := models.Section{
			SubjectID: subject.ID,
			Name:      topicJSON.Topic,
			Weight:    topicJSON.Weight,
		}
		if err := DB.Create(&section).Error; err != nil {
			log.Printf("Failed to create section: %v", err)
			continue
		}

		// Create subtopics
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

	log.Println("Successfully seeded subject structure")
}


