package models

import "time"

// WeeklyAIPlan stores a cached AI-generated weekly study plan per user, subject, and locale.
type WeeklyAIPlan struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index:idx_weekly_plan_user_subject_locale,unique" json:"user_id"`
	Subject     string    `gorm:"not null;index:idx_weekly_plan_user_subject_locale,unique" json:"subject"`
	Locale      string    `gorm:"not null;default:ru;index:idx_weekly_plan_user_subject_locale,unique" json:"locale"`
	PlanText    string    `gorm:"type:text;not null" json:"plan_text"`
	GeneratedAt time.Time `json:"generated_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// TableName matches GORM's default pluralization for WeeklyAIPlan (weekly_a_iplans).
func (WeeklyAIPlan) TableName() string {
	return "weekly_a_iplans"
}
