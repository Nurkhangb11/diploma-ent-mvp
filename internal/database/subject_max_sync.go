package database

import (
	"diploma-ent-mvp/internal/entconfig"
	"diploma-ent-mvp/internal/models"
	"log"
)

// SyncSubjectENTMaxScores sets subjects.max_score to canonical ENT weights (idempotent).
func SyncSubjectENTMaxScores() {
	for name, max := range entconfig.SubjectENTMax {
		res := DB.Model(&models.Subject{}).Where("name = ?", name).Update("max_score", max)
		if res.Error != nil {
			log.Printf("SyncSubjectENTMaxScores %q: %v", name, res.Error)
		}
	}
}
