package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/i18n"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"fmt"
	"strings"
)

// CachedQuestionLocale returns stored translations only (no OpenAI). Used for list endpoints.
func CachedQuestionLocale(q *models.Question, loc string) i18n.LocaleContent {
	loc = locale.Normalize(loc)
	m := i18n.EnsureQuestionRU(q)
	if loc == locale.RU {
		return m[locale.RU]
	}
	if c, ok := m[loc]; ok && strings.TrimSpace(c.QuestionText) != "" {
		return c
	}
	return m[locale.RU]
}

func EnsureQuestionLocale(q *models.Question, loc string) i18n.LocaleContent {
	loc = locale.Normalize(loc)
	m := i18n.EnsureQuestionRU(q)

	if loc == locale.RU {
		return m[locale.RU]
	}

	if c, ok := m[loc]; ok && strings.TrimSpace(c.QuestionText) != "" {
		return c
	}

	translated, err := translateQuestionContent(m[locale.RU], loc)
	if err == nil && strings.TrimSpace(translated.QuestionText) != "" {
		m[loc] = translated
		q.ContentI18n = i18n.SerializeContentI18n(m)
		_ = database.DB.Model(q).Update("content_i18n", q.ContentI18n).Error
		return translated
	}

	return m[locale.RU]
}

func LocalizeQuestion(q *models.Question, loc string) models.Question {
	content := EnsureQuestionLocale(q, loc)
	return i18n.ApplyContent(q, content, loc)
}

func translateQuestionContent(source i18n.LocaleContent, targetLocale string) (i18n.LocaleContent, error) {
	targetLocale = locale.Normalize(targetLocale)
	if targetLocale == locale.RU {
		return source, nil
	}

	payload, err := json.Marshal(source)
	if err != nil {
		return i18n.LocaleContent{}, err
	}

	targetLang := locale.LanguageNameEN(targetLocale)
	systemPrompt := fmt.Sprintf(
		"You are a professional translator for educational ENT exam content in Kazakhstan. "+
			"Translate the JSON values to %s. Keep the same JSON structure and keys. "+
			"Return ONLY valid JSON with fields: question_text, options (array), correct_answer, explanation, topic. "+
			"Translate accurately; preserve numbers, dates, and proper nouns where appropriate.",
		targetLang,
	)
	userPrompt := fmt.Sprintf("Translate this question JSON to %s:\n%s", targetLang, string(payload))

	raw, err := CallOpenAIRaw(systemPrompt, userPrompt, 600)
	if err != nil {
		return i18n.LocaleContent{}, err
	}

	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	raw = strings.TrimSpace(raw)

	var out i18n.LocaleContent
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return i18n.LocaleContent{}, fmt.Errorf("parse translation: %w", err)
	}
	if len(out.Options) == 0 {
		out.Options = source.Options
	}
	if strings.TrimSpace(out.CorrectAnswer) == "" && source.CorrectAnswer != "" {
		srcIdx := findOptionIndexForTranslate(source.Options, source.CorrectAnswer)
		if srcIdx >= 0 && srcIdx < len(out.Options) {
			out.CorrectAnswer = out.Options[srcIdx]
		}
	}
	return out, nil
}

func findOptionIndexForTranslate(options []string, answer string) int {
	answer = strings.TrimSpace(answer)
	for i, opt := range options {
		if strings.TrimSpace(opt) == answer {
			return i
		}
	}
	return -1
}
