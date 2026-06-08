package models

type Subtopic struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	SectionID uint   `gorm:"not null;index" json:"section_id"`
	Name      string `gorm:"not null" json:"name"`
	NameI18n  string `gorm:"type:text" json:"name_i18n,omitempty"`

	Section   Section    `gorm:"foreignKey:SectionID" json:"-"`
	Questions []Question `gorm:"foreignKey:SubtopicID" json:"-"`
}



