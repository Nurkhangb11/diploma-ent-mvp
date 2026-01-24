package models

type Question struct {
	ID            uint   `gorm:"primaryKey" json:"id"`
	Subject       string `gorm:"not null" json:"subject"`
	Topic         string `gorm:"not null" json:"topic"`
	QuestionText  string `gorm:"not null" json:"question_text"`
	Options       string `gorm:"type:text" json:"options"` // JSON массив
	CorrectAnswer string `gorm:"not null" json:"correct_answer"`
	Explanation   string `gorm:"type:text" json:"explanation"`
	SubtopicID    *uint  `gorm:"index" json:"subtopic_id"` // NULLABLE

	Subtopic Subtopic `gorm:"foreignKey:SubtopicID" json:"-"`
}
