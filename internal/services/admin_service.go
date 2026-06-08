package services

import (
	"diploma-ent-mvp/internal/database"
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type AdminUserDTO struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	Role         string    `json:"role"`
	TargetScore  int       `json:"target_score"`
	CreatedAt    time.Time `json:"created_at"`
	AttemptCount int64     `json:"attempt_count"`
}

type AdminQuestionDTO struct {
	ID            uint     `json:"id"`
	Subject       string   `json:"subject"`
	Topic         string   `json:"topic"`
	QuestionText  string   `json:"question_text"`
	Options       []string `json:"options"`
	CorrectAnswer string   `json:"correct_answer"`
	Explanation   string   `json:"explanation"`
	SubtopicID    *uint    `json:"subtopic_id"`
}

type CreateQuestionRequest struct {
	Subject       string
	Topic         string
	QuestionText  string
	Options       []string
	CorrectAnswer string
	Explanation   string
	SubtopicID    *uint
}

func ListUsers(page, limit int) ([]AdminUserDTO, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	if err := database.DB.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []models.User
	if err := database.DB.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	result := make([]AdminUserDTO, 0, len(users))
	for _, u := range users {
		var attemptCount int64
		database.DB.Model(&models.Attempt{}).Where("user_id = ?", u.ID).Count(&attemptCount)

		role := u.Role
		if role == "" {
			role = models.RoleStudent
		}

		result = append(result, AdminUserDTO{
			ID:           u.ID,
			Name:         u.Name,
			Email:        u.Email,
			Role:         role,
			TargetScore:  u.TargetScore,
			CreatedAt:    u.CreatedAt,
			AttemptCount: attemptCount,
		})
	}

	return result, total, nil
}

func ListQuestions(page, limit int, subject string) ([]AdminQuestionDTO, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	q := database.DB.Model(&models.Question{})
	if subject != "" {
		q = q.Where("subject = ?", subject)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var questions []models.Question
	query := database.DB.Order("id DESC").Offset(offset).Limit(limit)
	if subject != "" {
		query = query.Where("subject = ?", subject)
	}
	if err := query.Find(&questions).Error; err != nil {
		return nil, 0, err
	}

	result := make([]AdminQuestionDTO, 0, len(questions))
	for _, q := range questions {
		dto, err := questionToAdminDTO(q)
		if err != nil {
			continue
		}
		result = append(result, dto)
	}

	return result, total, nil
}

func CreateQuestion(req CreateQuestionRequest) (AdminQuestionDTO, error) {
	req.Subject = strings.TrimSpace(req.Subject)
	req.Topic = strings.TrimSpace(req.Topic)
	req.QuestionText = strings.TrimSpace(req.QuestionText)
	req.CorrectAnswer = strings.TrimSpace(req.CorrectAnswer)

	if req.Subject == "" || req.Topic == "" || req.QuestionText == "" || req.CorrectAnswer == "" {
		return AdminQuestionDTO{}, errors.New("missing required fields")
	}
	if len(req.Options) < 2 {
		return AdminQuestionDTO{}, errors.New("at least 2 options required")
	}

	optionsJSON, err := json.Marshal(req.Options)
	if err != nil {
		return AdminQuestionDTO{}, err
	}

	question := models.Question{
		Subject:       req.Subject,
		Topic:         req.Topic,
		QuestionText:  req.QuestionText,
		Options:       string(optionsJSON),
		CorrectAnswer: req.CorrectAnswer,
		Explanation:   strings.TrimSpace(req.Explanation),
		SubtopicID:    req.SubtopicID,
	}

	if err := database.DB.Create(&question).Error; err != nil {
		return AdminQuestionDTO{}, err
	}

	return questionToAdminDTO(question)
}

func questionToAdminDTO(q models.Question) (AdminQuestionDTO, error) {
	var options []string
	if q.Options != "" {
		if err := json.Unmarshal([]byte(q.Options), &options); err != nil {
			return AdminQuestionDTO{}, err
		}
	}

	return AdminQuestionDTO{
		ID:            q.ID,
		Subject:       q.Subject,
		Topic:         q.Topic,
		QuestionText:  q.QuestionText,
		Options:       options,
		CorrectAnswer: q.CorrectAnswer,
		Explanation:   q.Explanation,
		SubtopicID:    q.SubtopicID,
	}, nil
}

func ListSubjects() ([]string, error) {
	var subjects []string
	if err := database.DB.Model(&models.Question{}).Distinct("subject").Order("subject").Pluck("subject", &subjects).Error; err != nil {
		return nil, err
	}
	return subjects, nil
}
