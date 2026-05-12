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

func GenerateAIFeedback(question, correctAnswer, userAnswer, explanation string) (string, error) {
	isCorrect := strings.TrimSpace(correctAnswer) == strings.TrimSpace(userAnswer)

	systemPrompt := "Ты доброжелательный преподаватель для школьника. Отвечай только на русском языке. Пиши коротко и понятно, максимум 2-4 предложения. Используй только факты из предоставленного контекста, не придумывай новые данные."
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

	return callOpenAI(systemPrompt, userPrompt)
}

func GenerateAIChatReply(message, question, correctAnswer, userAnswer string) (string, error) {
	systemPrompt := "Ты преподаватель, который помогает школьнику понять тему и исправить ошибки. Отвечай только на русском языке, простыми словами, коротко и по делу. Используй только факты из контекста вопроса и ошибок; если контекста не хватает, честно скажи об этом."
	userPrompt := fmt.Sprintf(
		"Контекст:\nВопрос: %s\nПравильный ответ: %s\nОтвет ученика: %s\n\nСообщение ученика: %s",
		question,
		correctAnswer,
		userAnswer,
		message,
	)

	return callOpenAI(systemPrompt, userPrompt)
}

func callOpenAI(systemPrompt, userPrompt string) (string, error) {
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
		MaxTokens:   220,
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
