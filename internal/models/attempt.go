package models

import "time"

type Attempt struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	QuestionID uint      `gorm:"not null;index" json:"question_id"`
	UserAnswer string    `gorm:"not null" json:"user_answer"`
	Correct    bool      `gorm:"not null" json:"correct"`
	CreatedAt  time.Time `json:"created_at"`

	User     User     `gorm:"foreignKey:UserID" json:"-"`
	Question Question `gorm:"foreignKey:QuestionID" json:"-"`
}
