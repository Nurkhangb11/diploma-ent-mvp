package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"diploma-ent-mvp/internal/locale"
)

const (
	openAIURL          = "https://api.openai.com/v1/chat/completions"
	defaultOpenAIModel = "gpt-4o-mini"
)

type openAIChatRequest struct {
	Model       string              `json:"model"`
	Messages    []openAIChatMessage `json:"messages"`
	Temperature float64             `json:"temperature"`
	MaxTokens   int                 `json:"max_tokens"`
}

type openAIChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message openAIChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func aiSystemPrompt(role, loc string) string {
	lang := locale.LanguageName(loc)
	return fmt.Sprintf("%s Отвечай только на %s языке. Пиши коротко и понятно.", role, lang)
}

func GenerateAIFeedback(question, correctAnswer, userAnswer, explanation, loc string) (string, error) {
	isCorrect := strings.TrimSpace(correctAnswer) == strings.TrimSpace(userAnswer)

	systemPrompt := aiSystemPrompt("Ты доброжелательный преподаватель для школьника.", loc)
	userPrompt := fmt.Sprintf(
		"Сформируй краткую обратную связь по ответу ученика.\n"+
			"Вопрос: %s\n"+
			"Правильный ответ: %s\n"+
			"Ответ ученика: %s\n"+
			"Объяснение: %s\n"+
			"Ответ правильный: %t\n\n"+
			"Если ответ неверный — спокойно объясни ошибку простым языком.\n"+
			"Если ответ верный — похвали и кратко закрепи тему.",
		question,
		correctAnswer,
		userAnswer,
		explanation,
		isCorrect,
	)

	return callOpenAI(systemPrompt, userPrompt, maxTokensForPrompt(userPrompt))
}

func GenerateAIChatReply(message, question, correctAnswer, userAnswer, loc string) (string, error) {
	systemPrompt := aiSystemPrompt("Ты преподаватель, который помогает школьнику понять тему и исправить ошибки.", loc)
	userPrompt := fmt.Sprintf(
		"Контекст:\nВопрос: %s\nПравильный ответ: %s\nОтвет ученика: %s\n\nСообщение ученика: %s",
		question,
		correctAnswer,
		userAnswer,
		message,
	)

	return callOpenAI(systemPrompt, userPrompt, maxTokensForPrompt(userPrompt))
}

// GenerateWeeklyStudyPlan builds a structured weekly ENT study plan from analytics context.
func GenerateWeeklyStudyPlan(analyticsContext, primarySubject, loc string) (string, error) {
	recommend, growth, motivation := locale.WeeklyPlanSectionHeaders(loc)
	lang := locale.LanguageName(loc)

	systemPrompt := fmt.Sprintf(`Ты AI-репетитор по подготовке к ЕНТ в Казахстане. Пиши только на %s языке.
Отвечай кратко, структурировано, без воды. Тон — поддерживающий, понятный школьнику.
Используй ТОЛЬКО факты из предоставленной аналитики. Не выдумывай темы и цифры, которых нет в данных.
Если данных мало — честно скажи и предложи реалистичный минимум на неделю.

Формат ответа (строго соблюдай):

%s
• (конкретная рекомендация 1)
• (конкретная рекомендация 2)
• (ещё 2–4 пункта с числами вопросов/задач где уместно)

%s
+X–Y баллов

%s
(1–2 предложения)`, lang, recommend, growth, motivation)

	userPrompt := "Составь персональный план обучения на 7 дней.\n\n" + analyticsContext
	if primarySubject != "" {
		userPrompt += "\nСделай акцент на предмете: " + primarySubject + ", но учти все предметы из аналитики."
	}

	text, err := callOpenAI(systemPrompt, userPrompt, maxTokensForPrompt(userPrompt))
	if err != nil {
		return "", err
	}
	return text, nil
}

// CallOpenAIRaw exposes OpenAI for translation and other structured tasks.
func CallOpenAIRaw(systemPrompt, userPrompt string, maxTokens int) (string, error) {
	return callOpenAI(systemPrompt, userPrompt, maxTokens)
}

func callOpenAI(systemPrompt, userPrompt string, maxTokens int) (string, error) {
	apiKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	if apiKey == "" {
		return "", errors.New("OPENAI_API_KEY is not set")
	}

	model := strings.TrimSpace(os.Getenv("OPENAI_MODEL"))
	if model == "" {
		model = defaultOpenAIModel
	}

	payload := openAIChatRequest{
		Model: model,
		Messages: []openAIChatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.25,
		MaxTokens:   maxTokens,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, openAIURL, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 25 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var parsed openAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}

	if resp.StatusCode >= 400 {
		if parsed.Error != nil && parsed.Error.Message != "" {
			return "", errors.New(parsed.Error.Message)
		}
		return "", fmt.Errorf("openai request failed with status %d", resp.StatusCode)
	}

	if len(parsed.Choices) == 0 {
		return "", errors.New("openai returned empty response")
	}

	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

func maxTokensForPrompt(userPrompt string) int {
	if strings.Contains(userPrompt, "план обучения на 7 дней") || strings.Contains(userPrompt, "7 days") {
		return 450
	}
	return 220
}
