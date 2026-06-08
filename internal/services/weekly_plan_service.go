package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"errors"
	"fmt"
	"log"
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

var expectedGrowthPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)ожидаемый\s+рост[^+\d]*(\+\s*\d+\s*[–-]\s*\d+|\+\s*\d+)`),
	regexp.MustCompile(`(?i)expected\s+(?:score\s+)?growth[^+\d]*(\+\s*\d+\s*[–-]\s*\d+|\+\s*\d+)`),
	regexp.MustCompile(`(?i)болжам[^+\d]*(\+\s*\d+\s*[–-]\s*\d+|\+\s*\d+)`),
	regexp.MustCompile(`(?i)өсу[^+\d]*(\+\s*\d+\s*[–-]\s*\d+|\+\s*\d+)`),
}

// GetWeeklyStudyPlan returns a cached plan or generates a new one (max once per 7 days per user+subject+locale).
func GetWeeklyStudyPlan(userID uint, subject string, loc string, force bool) (*WeeklyPlanResponse, error) {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		subject = "История Казахстана"
	}
	loc = locale.Normalize(loc)

	now := time.Now().UTC()
	if !force {
		if cached, ok := findCachedWeeklyPlan(userID, subject, loc, now); ok {
			return cached, nil
		}
	}

	analytics, err := BuildWeeklyPlanAnalytics(userID, subject)
	if err != nil {
		return nil, err
	}

	planText := generateWeeklyPlanText(analytics, loc)
	if strings.TrimSpace(planText) == "" {
		planText = fallbackWeeklyPlan(analytics, loc)
	}

	generatedAt := now
	expiresAt := generatedAt.Add(weeklyPlanDuration)

	database.DB.Where("user_id = ? AND subject = ? AND locale = ?", userID, subject, loc).Delete(&models.WeeklyAIPlan{})
	row := models.WeeklyAIPlan{
		UserID:      userID,
		Subject:     subject,
		Locale:      loc,
		PlanText:    planText,
		GeneratedAt: generatedAt,
		ExpiresAt:   expiresAt,
	}
	if err := database.DB.Create(&row).Error; err != nil {
		log.Printf("weekly plan cache save failed: %v", err)
	}

	return &WeeklyPlanResponse{
		PlanText:       planText,
		ExpectedGrowth: extractExpectedGrowth(planText, loc),
		GeneratedAt:    generatedAt,
		ExpiresAt:      expiresAt,
		Cached:         false,
	}, nil
}

func generateWeeklyPlanText(analytics *WeeklyPlanAnalytics, loc string) string {
	if strings.TrimSpace(os.Getenv("OPENAI_API_KEY")) != "" {
		subjectLabel := locale.TranslateSubjectName(analytics.PrimarySubject, loc)
		text, err := GenerateWeeklyStudyPlan(analytics.FormatForPrompt(), subjectLabel, loc)
		if err == nil && strings.TrimSpace(text) != "" {
			return strings.TrimSpace(text)
		}
	}
	return fallbackWeeklyPlan(analytics, loc)
}

func fallbackWeeklyPlan(a *WeeklyPlanAnalytics, loc string) string {
	var b strings.Builder
	b.WriteString(locale.FallbackWeeklyPlanIntro(loc))
	b.WriteString("\n")
	for _, s := range a.Subjects {
		n := 10
		if s.WeakMastery < 0.4 {
			n = 15
		}
		b.WriteString(locale.FallbackWeeklyPlanQuestionLine(n, s.WeakSection, s.Subject, loc))
		b.WriteString("\n")
	}
	if len(a.RepeatMistakes) > 0 {
		switch locale.Normalize(loc) {
		case locale.KK:
			b.WriteString("• Қателерді қайталау тізіміндегі тақырыптар\n")
		case locale.EN:
			b.WriteString("• Review mistakes from your error list\n")
		default:
			b.WriteString("• Повтор ошибок по темам из списка повторов\n")
		}
	}
	_, growth, _ := locale.WeeklyPlanSectionHeaders(loc)
	b.WriteString("\n")
	b.WriteString(growth)
	b.WriteString("\n")
	b.WriteString(locale.DefaultExpectedGrowth(loc))
	b.WriteString("\n\n")
	if a.StreakCurrent > 0 {
		switch locale.Normalize(loc) {
		case locale.KK:
			fmt.Fprintf(&b, "Керемет streak %d күн — сол темпті жалғастыр!\n", a.StreakCurrent)
		case locale.EN:
			fmt.Fprintf(&b, "Great %d-day streak — keep it up!\n", a.StreakCurrent)
		default:
			fmt.Fprintf(&b, "Отличный streak %d дн. — продолжай в том же темпе!\n", a.StreakCurrent)
		}
	} else {
		switch locale.Normalize(loc) {
		case locale.KK:
			b.WriteString("Бүгін қысқа сессиядан баста — 10–15 минут прогресс береді.\n")
		case locale.EN:
			b.WriteString("Start with a short session today — 10–15 minutes already helps.\n")
		default:
			b.WriteString("Начни с короткой сессии сегодня — 10–15 минут уже дадут прогресс.\n")
		}
	}
	return b.String()
}

func extractExpectedGrowth(planText, loc string) string {
	for _, re := range expectedGrowthPatterns {
		if m := re.FindStringSubmatch(planText); len(m) > 1 {
			return strings.ReplaceAll(strings.TrimSpace(m[1]), " ", "")
		}
	}
	for _, line := range strings.Split(planText, "\n") {
		line = strings.TrimSpace(line)
		if strings.Contains(line, "+") && (strings.Contains(strings.ToLower(line), "балл") || strings.Contains(strings.ToLower(line), "point") || strings.Contains(strings.ToLower(line), "рост") || strings.Contains(strings.ToLower(line), "growth") || strings.Contains(strings.ToLower(line), "өсу")) {
			return line
		}
	}
	return locale.DefaultExpectedGrowth(loc)
}

func findCachedWeeklyPlan(userID uint, subject, loc string, now time.Time) (*WeeklyPlanResponse, bool) {
	var existing models.WeeklyAIPlan
	err := database.DB.Where("user_id = ? AND subject = ? AND locale = ? AND expires_at > ?", userID, subject, loc, now).
		Order("generated_at DESC").
		First(&existing).Error
	if err != nil {
		// Reuse Russian plan when locale-specific cache is missing (e.g. after i18n migration).
		if loc != locale.RU {
			err = database.DB.Where("user_id = ? AND subject = ? AND locale = ? AND expires_at > ?", userID, subject, locale.RU, now).
				Order("generated_at DESC").
				First(&existing).Error
		}
		if err != nil {
			return nil, false
		}
	}
	return &WeeklyPlanResponse{
		PlanText:       existing.PlanText,
		ExpectedGrowth: extractExpectedGrowth(existing.PlanText, loc),
		GeneratedAt:    existing.GeneratedAt,
		ExpiresAt:      existing.ExpiresAt,
		Cached:         true,
	}, true
}

// ErrWeeklyPlanUserNotFound when user does not exist.
var ErrWeeklyPlanUserNotFound = errors.New("user not found")
