package i18n

import (
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"strings"
)

// LocaleContent holds localized question fields.
type LocaleContent struct {
	QuestionText  string   `json:"question_text"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Explanation   string   `json:"explanation"`
	Topic         string   `json:"topic,omitempty"`
}

type contentI18nMap map[string]LocaleContent

func ParseOptionsJSON(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var opts []string
	if err := json.Unmarshal([]byte(raw), &opts); err != nil {
		return nil
	}
	return opts
}

func MarshalOptions(opts []string) string {
	b, err := json.Marshal(opts)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func ParseContentI18n(raw string) contentI18nMap {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return contentI18nMap{}
	}
	var m contentI18nMap
	if err := json.Unmarshal([]byte(raw), &m); err != nil {
		return contentI18nMap{}
	}
	return m
}

func BuildRUFromQuestion(q *models.Question) LocaleContent {
	return LocaleContent{
		QuestionText:  q.QuestionText,
		Options:       ParseOptionsJSON(q.Options),
		CorrectAnswer: q.CorrectAnswer,
		Explanation:   q.Explanation,
		Topic:         q.Topic,
	}
}

func findOptionIndex(options []string, answer string) int {
	answer = strings.TrimSpace(answer)
	for i, opt := range options {
		if strings.TrimSpace(opt) == answer {
			return i
		}
	}
	return -1
}

func ComputeCorrectAnswerIndex(options []string, correctAnswer string) *int {
	idx := findOptionIndex(options, correctAnswer)
	if idx < 0 {
		return nil
	}
	return &idx
}

func EnsureQuestionRU(q *models.Question) contentI18nMap {
	m := ParseContentI18n(q.ContentI18n)
	if _, ok := m[locale.RU]; !ok {
		m[locale.RU] = BuildRUFromQuestion(q)
	}
	return m
}

func ContentForLocale(q *models.Question, loc string, m contentI18nMap) LocaleContent {
	loc = locale.Normalize(loc)
	if loc == locale.RU {
		return m[locale.RU]
	}
	if c, ok := m[loc]; ok && strings.TrimSpace(c.QuestionText) != "" {
		return c
	}
	return m[locale.RU]
}

func ApplyContent(q *models.Question, content LocaleContent, loc string) models.Question {
	out := *q
	out.QuestionText = content.QuestionText
	out.Options = MarshalOptions(content.Options)
	out.CorrectAnswer = content.CorrectAnswer
	out.Explanation = content.Explanation
	if content.Topic != "" {
		out.Topic = content.Topic
	} else if loc != locale.RU {
		out.Topic = locale.TranslateTopicName(q.Topic, loc)
	}
	return out
}

func IsAnswerCorrect(q *models.Question, content LocaleContent, userAnswer string) bool {
	userAnswer = strings.TrimSpace(userAnswer)
	if q.CorrectAnswerIndex != nil {
		idx := findOptionIndex(content.Options, userAnswer)
		return idx >= 0 && idx == *q.CorrectAnswerIndex
	}
	return strings.TrimSpace(content.CorrectAnswer) == userAnswer
}

func LocalizedCorrectAnswer(q *models.Question, content LocaleContent) string {
	if q.CorrectAnswerIndex != nil && *q.CorrectAnswerIndex >= 0 && *q.CorrectAnswerIndex < len(content.Options) {
		return content.Options[*q.CorrectAnswerIndex]
	}
	return content.CorrectAnswer
}

func SerializeContentI18n(m contentI18nMap) string {
	b, err := json.Marshal(m)
	if err != nil {
		return ""
	}
	return string(b)
}
