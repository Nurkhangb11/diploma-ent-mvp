package models

import "time"

// WeeklyAIPlan stores a cached AI-generated weekly study plan per user and subject.
type WeeklyAIPlan struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index:idx_weekly_plan_user_subject,unique" json:"user_id"`
	Subject     string    `gorm:"not null;index:idx_weekly_plan_user_subject,unique" json:"subject"`
	PlanText    string    `gorm:"type:text;not null" json:"plan_text"`
	GeneratedAt time.Time `json:"generated_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}
