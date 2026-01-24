package models

type Section struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	SubjectID uint   `gorm:"not null;index" json:"subject_id"`
	Name      string `gorm:"not null" json:"name"`
	Weight    int    `gorm:"not null" json:"weight"` // Баллы за тему

	Subject   Subject    `gorm:"foreignKey:SubjectID" json:"-"`
	Subtopics []Subtopic `gorm:"foreignKey:SectionID" json:"-"`
}


