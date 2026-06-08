package models

import "time"

const (
	RoleStudent = "student"
	RoleAdmin   = "admin"
)

type User struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"not null" json:"name"`
	Email        string    `gorm:"not null;uniqueIndex" json:"email"`
	Role         string    `gorm:"not null;default:student" json:"role"`
	TargetScore  int       `json:"target_score"`
	PasswordHash string    `gorm:"type:text" json:"-"`
	Avatar       string    `gorm:"type:text" json:"avatar"`
	CreatedAt    time.Time `json:"created_at"`
}
