package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/entconfig"
	"diploma-ent-mvp/internal/models"
	"fmt"
	"sort"
	"strings"
	"time"
)

// WeeklyPlanAnalytics is aggregated user data for AI weekly plan generation.
type WeeklyPlanAnalytics struct {
	UserID           uint
	PrimarySubject   string
	UserName         string
	TargetScore      int
	StreakCurrent    int
	StreakBest       int
	TotalAttempts    int
	RecentAttempts   int
	RecentAccuracy   float64
	Subjects         []SubjectWeeklySnapshot
	RepeatMistakes   []string
}

type SubjectWeeklySnapshot struct {
	Subject         string
	PredictedScore  float64
	MaxScore        int
	Confidence      float64
	WeakSection     string
	WeakMastery     float64
	StrongSection   string
	WrongTopics     []string
}

// BuildWeeklyPlanAnalytics collects read-only stats (does not touch adaptive/prediction logic).
func BuildWeeklyPlanAnalytics(userID uint, primarySubject string) (*WeeklyPlanAnalytics, error) {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return nil, err
	}

	loc := time.FixedZone("Asia/Almaty", 5*3600)
	now := time.Now().In(loc)
	weekAgo := now.AddDate(0, 0, -7)

	var attempts []models.Attempt
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&attempts).Error; err != nil {
		return nil, err
	}

	countByDay := make(map[string]int)
	recentAttempts := 0
	recentCorrect := 0
	for _, a := range attempts {
		ds := a.CreatedAt.In(loc).Format("2006-01-02")
		countByDay[ds]++
		if a.CreatedAt.After(weekAgo) {
			recentAttempts++
			if a.Correct {
				recentCorrect++
			}
		}
	}

	var dates []string
	for d := range countByDay {
		dates = append(dates, d)
	}
	sort.Strings(dates)
	currentStreak := weeklyPlanCurrentStreak(dates, now, loc)
	bestStreak := weeklyPlanBestStreak(dates)

	recentAcc := 0.0
	if recentAttempts > 0 {
		recentAcc = float64(recentCorrect) / float64(recentAttempts) * 100
	}

	subjectOrder := []string{
		"История Казахстана",
		"Математическая грамотность",
		"Грамотность чтения",
	}
	subjects := make([]SubjectWeeklySnapshot, 0, len(subjectOrder))
	for _, name := range subjectOrder {
		if _, ok := entconfig.SubjectENTMax[name]; !ok {
			continue
		}
		subjects = append(subjects, snapshotForSubject(userID, name))
	}

	repeatMistakes := collectRepeatMistakes(userID, primarySubject, 8)

	return &WeeklyPlanAnalytics{
		UserID:         userID,
		PrimarySubject: primarySubject,
		UserName:       user.Name,
		TargetScore:    user.TargetScore,
		StreakCurrent:  currentStreak,
		StreakBest:     bestStreak,
		TotalAttempts:  len(attempts),
		RecentAttempts: recentAttempts,
		RecentAccuracy: recentAcc,
		Subjects:       subjects,
		RepeatMistakes: repeatMistakes,
	}, nil
}

func snapshotForSubject(userID uint, subjectName string) SubjectWeeklySnapshot {
	snap := SubjectWeeklySnapshot{
		Subject:  subjectName,
		MaxScore: entconfig.MaxPoints(subjectName),
	}
	pred, err := CalculatePrediction(userID, subjectName)
	if err != nil || pred == nil {
		return snap
	}
	snap.PredictedScore = pred.PredictedScore
	snap.Confidence = pred.Confidence
	if len(pred.SectionScores) > 0 {
		weak := pred.SectionScores[0]
		strong := pred.SectionScores[0]
		for _, s := range pred.SectionScores {
			if s.Mastery < weak.Mastery {
				weak = s
			}
			if s.Mastery > strong.Mastery {
				strong = s
			}
		}
		snap.WeakSection = weak.SectionName
		snap.WeakMastery = weak.Mastery
		snap.StrongSection = strong.SectionName
	}

	var wrongTopics []string
	var attempts []models.Attempt
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(200).Find(&attempts)
	seen := make(map[string]struct{})
	for _, a := range attempts {
		if a.Correct {
			continue
		}
		var q models.Question
		if err := database.DB.First(&q, a.QuestionID).Error; err != nil {
			continue
		}
		if q.Subject != subjectName {
			continue
		}
		topic := strings.TrimSpace(q.Topic)
		if topic == "" {
			topic = strings.TrimSpace(q.QuestionText)
			if len(topic) > 60 {
				topic = topic[:60] + "…"
			}
		}
		if _, ok := seen[topic]; ok {
			continue
		}
		seen[topic] = struct{}{}
		wrongTopics = append(wrongTopics, topic)
		if len(wrongTopics) >= 5 {
			break
		}
	}
	snap.WrongTopics = wrongTopics
	return snap
}

func collectRepeatMistakes(userID uint, subject string, limit int) []string {
	type key struct {
		qid uint
	}
	wrongCount := make(map[uint]int)
	var attempts []models.Attempt
	database.DB.Where("user_id = ? AND correct = ?", userID, false).Order("created_at DESC").Limit(300).Find(&attempts)
	for _, a := range attempts {
		wrongCount[a.QuestionID]++
	}

	type item struct {
		id    uint
		count int
	}
	var items []item
	for id, c := range wrongCount {
		if c >= 2 {
			items = append(items, item{id: id, count: c})
		}
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].count > items[j].count
	})

	out := make([]string, 0, limit)
	for _, it := range items {
		var q models.Question
		if err := database.DB.First(&q, it.id).Error; err != nil {
			continue
		}
		if subject != "" && q.Subject != subject {
			continue
		}
		label := q.Topic
		if label == "" {
			label = q.QuestionText
		}
		if len(label) > 70 {
			label = label[:70] + "…"
		}
		out = append(out, fmt.Sprintf("%s (ошибок: %d)", label, it.count))
		if len(out) >= limit {
			break
		}
	}
	return out
}

func (a *WeeklyPlanAnalytics) FormatForPrompt() string {
	var b strings.Builder
	fmt.Fprintf(&b, "Ученик: %s\n", a.UserName)
	if a.TargetScore > 0 {
		fmt.Fprintf(&b, "Цель на ЕНТ: %d баллов\n", a.TargetScore)
	}
	fmt.Fprintf(&b, "Основной предмет в интерфейсе: %s\n", a.PrimarySubject)
	fmt.Fprintf(&b, "Streak: %d дн. (лучший %d)\n", a.StreakCurrent, a.StreakBest)
	fmt.Fprintf(&b, "Всего ответов: %d | за 7 дней: %d (точность %.0f%%)\n\n",
		a.TotalAttempts, a.RecentAttempts, a.RecentAccuracy)

	for _, s := range a.Subjects {
		fmt.Fprintf(&b, "— %s: прогноз %.1f/%d, уверенность %.0f%%\n",
			s.Subject, s.PredictedScore, s.MaxScore, s.Confidence*100)
		if s.WeakSection != "" {
			fmt.Fprintf(&b, "  слабая секция: %s (mastery %.0f%%)\n", s.WeakSection, s.WeakMastery*100)
		}
		if s.StrongSection != "" {
			fmt.Fprintf(&b, "  сильная секция: %s\n", s.StrongSection)
		}
		if len(s.WrongTopics) > 0 {
			fmt.Fprintf(&b, "  ошибки по темам: %s\n", strings.Join(s.WrongTopics, "; "))
		}
	}

	if len(a.RepeatMistakes) > 0 {
		b.WriteString("\nПовторяющиеся ошибки:\n")
		for _, m := range a.RepeatMistakes {
			fmt.Fprintf(&b, "• %s\n", m)
		}
	}
	return b.String()
}

func weeklyPlanBestStreak(sortedDates []string) int {
	if len(sortedDates) == 0 {
		return 0
	}
	loc := time.FixedZone("Asia/Almaty", 5*3600)
	best, run := 1, 1
	for i := 1; i < len(sortedDates); i++ {
		prev, _ := time.ParseInLocation("2006-01-02", sortedDates[i-1], loc)
		cur, _ := time.ParseInLocation("2006-01-02", sortedDates[i], loc)
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

func weeklyPlanCurrentStreak(sortedDates []string, today time.Time, loc *time.Location) int {
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
	d, _ := time.ParseInLocation("2006-01-02", start, loc)
	for {
		ds := d.Format("2006-01-02")
		if _, ok := set[ds]; ok {
			streak++
			d = d.AddDate(0, 0, -1)
		} else {
			break
		}
	}
	return streak
}
