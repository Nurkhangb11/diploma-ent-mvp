package models

type Subtopic struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	SectionID uint   `gorm:"not null;index" json:"section_id"`
	Name      string `gorm:"not null" json:"name"`

	Section   Section    `gorm:"foreignKey:SectionID" json:"-"`
	Questions []Question `gorm:"foreignKey:SubtopicID" json:"-"`
}


