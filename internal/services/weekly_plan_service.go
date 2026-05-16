package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"
)

const weeklyPlanDuration = 7 * 24 * time.Hour

// WeeklyPlanResponse is returned by GET /api/ai/weekly-plan.
type WeeklyPlanResponse struct {
	PlanText       string    `json:"plan_text"`
	ExpectedGrowth string    `json:"expected_growth"`
	GeneratedAt    time.Time `json:"generated_at"`
	ExpiresAt      time.Time `json:"expires_at"`
	Cached         bool      `json:"cached"`
}

var expectedGrowthRe = regexp.MustCompile(`(?i)ожидаемый\s+рост[^+\d]*(\+\s*\d+\s*[–-]\s*\d+|\+\s*\d+)`)

// GetWeeklyStudyPlan returns a cached plan or generates a new one (max once per 7 days per user+subject).
func GetWeeklyStudyPlan(userID uint, subject string, force bool) (*WeeklyPlanResponse, error) {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		subject = "История Казахстана"
	}

	now := time.Now().UTC()
	if !force {
		var existing models.WeeklyAIPlan
		err := database.DB.Where("user_id = ? AND subject = ? AND expires_at > ?", userID, subject, now).
			Order("generated_at DESC").
			First(&existing).Error
		if err == nil {
			return &WeeklyPlanResponse{
				PlanText:       existing.PlanText,
				ExpectedGrowth: extractExpectedGrowth(existing.PlanText),
				GeneratedAt:    existing.GeneratedAt,
				ExpiresAt:      existing.ExpiresAt,
				Cached:         true,
			}, nil
		}
	}

	analytics, err := BuildWeeklyPlanAnalytics(userID, subject)
	if err != nil {
		return nil, err
	}

	planText := generateWeeklyPlanText(analytics)
	if strings.TrimSpace(planText) == "" {
		planText = fallbackWeeklyPlan(analytics)
	}

	generatedAt := now
	expiresAt := generatedAt.Add(weeklyPlanDuration)

	// Upsert: one active row per user+subject
	database.DB.Where("user_id = ? AND subject = ?", userID, subject).Delete(&models.WeeklyAIPlan{})
	row := models.WeeklyAIPlan{
		UserID:      userID,
		Subject:     subject,
		PlanText:    planText,
		GeneratedAt: generatedAt,
		ExpiresAt:   expiresAt,
	}
	if err := database.DB.Create(&row).Error; err != nil {
		return nil, err
	}

	return &WeeklyPlanResponse{
		PlanText:       planText,
		ExpectedGrowth: extractExpectedGrowth(planText),
		GeneratedAt:    generatedAt,
		ExpiresAt:      expiresAt,
		Cached:         false,
	}, nil
}

func generateWeeklyPlanText(analytics *WeeklyPlanAnalytics) string {
	if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) != "" {
		text, err := GenerateWeeklyStudyPlan(analytics.FormatForPrompt(), analytics.PrimarySubject)
		if err == nil && strings.TrimSpace(text) != "" {
			return strings.TrimSpace(text)
		}
	}
	return fallbackWeeklyPlan(analytics)
}

func fallbackWeeklyPlan(a *WeeklyPlanAnalytics) string {
	var b strings.Builder
	b.WriteString("AI рекомендует на эту неделю:\n")
	for _, s := range a.Subjects {
		n := 10
		if s.WeakMastery < 0.4 {
			n = 15
		}
		if s.WeakSection != "" {
			fmt.Fprintf(&b, "• %d вопросов по слабой теме «%s» (%s)\n", n, s.WeakSection, s.Subject)
		} else {
			fmt.Fprintf(&b, "• %d вопросов по предмету «%s»\n", n, s.Subject)
		}
	}
	if len(a.RepeatMistakes) > 0 {
		b.WriteString("• Повтор ошибок по темам из списка повторов\n")
	}
	b.WriteString("\nОжидаемый рост прогноза:\n+2–4 балла\n\n")
	if a.StreakCurrent > 0 {
		fmt.Fprintf(&b, "Отличный streak %d дн. — продолжай в том же темпе!\n", a.StreakCurrent)
	} else {
		b.WriteString("Начни с короткой сессии сегодня — 10–15 минут уже дадут прогресс.\n")
	}
	return b.String()
}

func extractExpectedGrowth(planText string) string {
	if m := expectedGrowthRe.FindStringSubmatch(planText); len(m) > 1 {
		return strings.ReplaceAll(strings.TrimSpace(m[1]), " ", "")
	}
	for _, line := range strings.Split(planText, "\n") {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "+") && (strings.Contains(line, "балл") || strings.Contains(line, "рост")) {
			return line
		}
	}
	return "+2–4 балла"
}

// ErrWeeklyPlanUserNotFound when user does not exist.
var ErrWeeklyPlanUserNotFound = errors.New("user not found")
