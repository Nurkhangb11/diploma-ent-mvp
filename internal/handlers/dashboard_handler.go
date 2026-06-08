package handlers

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"diploma-ent-mvp/internal/services"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const dashboardDefaultSubject = "История Казахстана"

type heatmapDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type streakInfo struct {
	Current int    `json:"current"`
	Best    int    `json:"best"`
	Badge   string `json:"badge"`
}

// GetDashboard aggregates read-only stats for the UI dashboard (streak, heatmap, prediction summary).
// Does not modify adaptive selection or prediction formulas.
func GetDashboard(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID64, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}
	userID := uint(userID64)

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	subject := c.DefaultQuery("subject", dashboardDefaultSubject)
	lang := locale.Parse(c)

	var attempts []models.Attempt
	if err := database.DB.Where("user_id = ?", userID).Order("created_at ASC").Find(&attempts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch attempts"})
		return
	}

	loc := time.FixedZone("Asia/Almaty", 5*3600)
	countByDay := make(map[string]int)
	for _, a := range attempts {
		d := a.CreatedAt.In(loc).Format("2006-01-02")
		countByDay[d]++
	}

	// Heatmap: last 371 days (53 weeks)
	today := time.Now().In(loc)
	start := today.AddDate(0, 0, -370)
	heatmap := make([]heatmapDay, 0, 371)
	for d := start; !d.After(today); d = d.AddDate(0, 0, 1) {
		ds := d.Format("2006-01-02")
		heatmap = append(heatmap, heatmapDay{Date: ds, Count: countByDay[ds]})
	}

	datesSet := make(map[string]struct{})
	for k := range countByDay {
		datesSet[k] = struct{}{}
	}
	var dates []string
	for d := range datesSet {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	currentStreak := computeCurrentStreak(dates, today, loc)
	bestStreak := computeBestStreak(dates)

	pred, _ := services.CalculatePrediction(userID, subject)

	var weakTopicRU, strongTopicRU string
	if pred != nil && len(pred.SectionScores) > 0 {
		weakTopicRU = pred.SectionScores[0].SectionName
		strongTopicRU = pred.SectionScores[0].SectionName
		weakM := pred.SectionScores[0].Mastery
		strongM := pred.SectionScores[0].Mastery
		for _, s := range pred.SectionScores {
			if s.Mastery < weakM {
				weakM = s.Mastery
				weakTopicRU = s.SectionName
			}
			if s.Mastery > strongM {
				strongM = s.Mastery
				strongTopicRU = s.SectionName
			}
		}
	}

	if pred != nil {
		pred.Message = locale.FormatPredictionMessage(pred.ConfidenceLevel, lang)
		for i := range pred.SectionScores {
			pred.SectionScores[i].SectionName = locale.TranslateTopicName(pred.SectionScores[i].SectionName, lang)
		}
	}

	level, levelLabel := userLevelFromAttempts(len(attempts), pred)
	levelLabel = locale.LevelLabel(level, lang)

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":           user.ID,
			"name":         user.Name,
			"target_score": user.TargetScore,
			"avatar":       user.Avatar,
		},
		"subject":     locale.TranslateSubjectName(subject, lang),
		"subject_key": subject,
		"streak": streakInfo{
			Current: currentStreak,
			Best:    bestStreak,
			Badge:   streakBadge(maxInt(currentStreak, bestStreak)),
		},
		"heatmap":    heatmap,
		"prediction": pred,
		"topics": gin.H{
			"weak":   locale.TranslateTopicName(weakTopicRU, lang),
			"strong": locale.TranslateTopicName(strongTopicRU, lang),
		},
		"level": gin.H{
			"code":  level,
			"label": levelLabel,
		},
		"totals": gin.H{
			"attempts": len(attempts),
		},
	})
}

func streakBadge(best int) string {
	switch {
	case best >= 100:
		return "🐐"
	case best >= 30:
		return "👑"
	case best >= 7:
		return "🔥🔥"
	case best >= 1:
		return "🔥"
	default:
		return ""
	}
}

func parseDate(loc *time.Location, s string) time.Time {
	t, _ := time.ParseInLocation("2006-01-02", s, loc)
	return t
}

func computeBestStreak(sortedDates []string) int {
	if len(sortedDates) == 0 {
		return 0
	}
	loc := time.FixedZone("Asia/Almaty", 5*3600)
	best := 1
	run := 1
	for i := 1; i < len(sortedDates); i++ {
		prev := parseDate(loc, sortedDates[i-1])
		cur := parseDate(loc, sortedDates[i])
		if cur.Sub(prev) == 24*time.Hour {
			run++
			if run > best {
				best = run
			}
		} else {
			run = 1
		}
	}
	return best
}

// Current streak: consecutive calendar days with ≥1 attempt ending at today (KZ) or carried from yesterday if today empty.
func computeCurrentStreak(sortedDates []string, today time.Time, loc *time.Location) int {
	if len(sortedDates) == 0 {
		return 0
	}
	set := make(map[string]struct{}, len(sortedDates))
	for _, d := range sortedDates {
		set[d] = struct{}{}
	}
	todayStr := today.Format("2006-01-02")
	yesterday := today.AddDate(0, 0, -1).Format("2006-01-02")

	start := todayStr
	if _, ok := set[todayStr]; !ok {
		if _, ok := set[yesterday]; ok {
			start = yesterday
		} else {
			return 0
		}
	}

	streak := 0
	for d := parseDate(loc, start); ; d = d.AddDate(0, 0, -1) {
		ds := d.Format("2006-01-02")
		if _, ok := set[ds]; ok {
			streak++
		} else {
			break
		}
	}
	return streak
}

func userLevelFromAttempts(attempts int, pred *services.PredictionResult) (string, string) {
	score := 0.0
	if pred != nil {
		score = pred.PredictedScore
	}
	if attempts < 5 {
		return "beginner", "Beginner"
	}
	if score < 8 || attempts < 20 {
		return "intermediate", "Intermediate"
	}
	if score < 14 {
		return "advanced", "Advanced"
	}
	return "master", "Master"
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
