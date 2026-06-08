package database

import (
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"log"
	"os"
	"strings"
)

// SubjectJSON mirrors *_kz.json and ent_* subject tree files.
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
	Subtopic  string               `json:"subtopic"`
	Passage   string               `json:"passage"`
	Questions []QuestionSeedUnion  `json:"questions"`
	Mastery   float64              `json:"mastery"` // present in some files; ignored for seeding
}

// QuestionSeedUnion supports:
// 1) legacy ref rows: { "id": 101 } — link existing question by primary key
// 2) embedded rows: full question payload — insert Question and set subtopic_id
type QuestionSeedUnion struct {
	ID            uint     `json:"id"`
	QuestionText  string   `json:"questionText"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correctAnswer"`
	Explanation   string   `json:"explanation"`
}

func isEmbeddedQuestion(q QuestionSeedUnion) bool {
	return strings.TrimSpace(q.QuestionText) != ""
}

func isRefOnlyQuestion(q QuestionSeedUnion) bool {
	return !isEmbeddedQuestion(q) && q.ID > 0
}

func composeQuestionText(passage, questionText string) string {
	p := strings.TrimSpace(passage)
	if p == "" {
		return questionText
	}
	return "Текст для чтения:\n\n" + p + "\n\n" + questionText
}

func seedSubjectTreeFromFile(fullPath, name string, subjectJSON SubjectJSON) bool {
	if strings.TrimSpace(subjectJSON.Subject) == "" {
		return false
	}

	var existingSubject models.Subject
	if err := DB.Where("name = ?", subjectJSON.Subject).First(&existingSubject).Error; err == nil {
		log.Printf("Subject %q already exists, skipping %s", subjectJSON.Subject, name)
		return false
	}

	subject := models.Subject{
		Name:     subjectJSON.Subject,
		MaxScore: subjectJSON.TotalScore,
	}
	if err := DB.Create(&subject).Error; err != nil {
		log.Printf("Failed to create subject from %s: %v", name, err)
		return false
	}
	log.Printf("Created subject: %s (max_score: %d)", subject.Name, subject.MaxScore)

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

			for _, q := range subtopicJSON.Questions {
				switch {
				case isEmbeddedQuestion(q):
					opts, err := json.Marshal(q.Options)
					if err != nil {
						log.Printf("Failed to marshal options in %s: %v", name, err)
						continue
					}
					text := composeQuestionText(subtopicJSON.Passage, q.QuestionText)
					nq := models.Question{
						Subject:       subjectJSON.Subject,
						Topic:         topicJSON.Topic,
						QuestionText:  text,
						Options:       string(opts),
						CorrectAnswer: q.CorrectAnswer,
						Explanation:   q.Explanation,
						SubtopicID:    &subtopic.ID,
					}
					if err := DB.Create(&nq).Error; err != nil {
						log.Printf("Failed to create question in %s: %v", name, err)
					}

				case isRefOnlyQuestion(q):
					if err := DB.Model(&models.Question{}).
						Where("id = ?", q.ID).
						Update("subtopic_id", subtopic.ID).Error; err != nil {
						log.Printf("Failed to update question %d with subtopic_id: %v", q.ID, err)
					}

				default:
					log.Printf("Skipping invalid question entry in %s (subtopic %q)", name, subtopicJSON.Subtopic)
				}
			}
		}
	}

	return true
}

func isSubjectStructureFile(name string) bool {
	if strings.HasSuffix(name, "_kz.json") {
		return true
	}
	if strings.HasPrefix(name, "ent_") && strings.HasSuffix(name, ".json") {
		return true
	}
	return false
}

// SeedSubjectStructure loads subject hierarchy from JSON files in internal/database.
// - *_kz.json: legacy layout with question refs { "id" } pointing at rows from questions.json
// - ent_*.json: self-contained trees with embedded questions (e.g. ent_math_100_questions.json)
// Does not change adaptive or prediction logic — only fills Subject/Section/Subtopic/Question.
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
		if !isSubjectStructureFile(name) {
			continue
		}

		fullPath := "internal/database/" + name

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

		if seedSubjectTreeFromFile(fullPath, name, subjectJSON) {
			seededAny = true
		}
	}

	if !seededAny {
		log.Println("No new subject structure JSON files to seed (subjects may already exist)")
	}
}
