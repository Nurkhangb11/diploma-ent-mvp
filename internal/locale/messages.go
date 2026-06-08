package locale

import "fmt"

func LevelLabel(code, loc string) string {
	loc = Normalize(loc)
	labels := map[string]map[string]string{
		"beginner":     {RU: "Новичок", KK: "Бастапқы", EN: "Beginner"},
		"intermediate": {RU: "Средний", KK: "Орта", EN: "Intermediate"},
		"advanced":     {RU: "Продвинутый", KK: "Жоғары", EN: "Advanced"},
		"master":       {RU: "Мастер", KK: "Шебер", EN: "Master"},
	}
	if m, ok := labels[code]; ok {
		if l, ok := m[loc]; ok {
			return l
		}
	}
	return code
}

func FormatPredictionMessage(confidenceLevel, loc string) string {
	loc = Normalize(loc)
	switch confidenceLevel {
	case "low":
		switch loc {
		case KK:
			return "⚠️ Болжам дәлдігі төмен. Нақтырақ баға алу үшін көбірек сұраққа жауап беріңіз."
		case EN:
			return "⚠️ Low prediction accuracy. Answer more questions for a better estimate."
		default:
			return "⚠️ Низкая точность прогноза. Рекомендуется ответить на больше вопросов для более точной оценки."
		}
	case "high":
		switch loc {
		case KK:
			return "✅ Болжам дәлдігі жоғары."
		case EN:
			return "✅ High prediction accuracy."
		default:
			return "✅ Высокая точность прогноза."
		}
	default:
		switch loc {
		case KK:
			return "ℹ️ Болжам дәлдігі орташа."
		case EN:
			return "ℹ️ Medium prediction accuracy."
		default:
			return "ℹ️ Средняя точность прогноза."
		}
	}
}

func WeeklyPlanSectionHeaders(loc string) (recommend, growth, motivation string) {
	switch Normalize(loc) {
	case KK:
		return "AI осы аптаға ұсынады:", "Болжамдағы өсу:", "Мотивация:"
	case EN:
		return "AI recommends this week:", "Expected score growth:", "Motivation:"
	default:
		return "AI рекомендует на эту неделю:", "Ожидаемый рост прогноза:", "Мотивация:"
	}
}

func DefaultExpectedGrowth(loc string) string {
	switch Normalize(loc) {
	case KK:
		return "+2–4 балл"
	case EN:
		return "+2–4 points"
	default:
		return "+2–4 балла"
	}
}

func FallbackWeeklyPlanIntro(loc string) string {
	recommend, _, _ := WeeklyPlanSectionHeaders(loc)
	return recommend
}

func FallbackWeeklyPlanQuestionLine(n int, weakSection, subject, loc string) string {
	loc = Normalize(loc)
	subject = TranslateSubjectName(subject, loc)
	weakSection = TranslateTopicName(weakSection, loc)
	switch loc {
	case KK:
		if weakSection != "" {
			return fmt.Sprintf("• «%s» (%s) әлсіз тақырыбы бойынша %d сұрақ", weakSection, subject, n)
		}
		return fmt.Sprintf("• «%s» пәні бойынша %d сұрақ", subject, n)
	case EN:
		if weakSection != "" {
			return fmt.Sprintf("• %d questions on weak topic «%s» (%s)", n, weakSection, subject)
		}
		return fmt.Sprintf("• %d questions on «%s»", n, subject)
	default:
		if weakSection != "" {
			return fmt.Sprintf("• %d вопросов по слабой теме «%s» (%s)", n, weakSection, subject)
		}
		return fmt.Sprintf("• %d вопросов по предмету «%s»", n, subject)
	}
}
