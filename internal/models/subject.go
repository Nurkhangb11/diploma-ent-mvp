package models

type Subject struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Name     string `gorm:"not null;uniqueIndex" json:"name"`
	MaxScore int    `gorm:"not null" json:"max_score"`

	Sections []Section `gorm:"foreignKey:SubjectID" json:"-"`
}


