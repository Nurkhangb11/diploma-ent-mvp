package locale

import (
	"strings"
	"sync"
)

var subjectNames = map[string]map[string]string{
	"История Казахстана": {
		RU: "История Казахстана",
		KK: "Қазақстан тарихы",
		EN: "History of Kazakhstan",
	},
	"Математическая грамотность": {
		RU: "Математическая грамотность",
		KK: "Математикалық сауаттылық",
		EN: "Mathematical literacy",
	},
	"Грамотность чтения": {
		RU: "Грамотность чтения",
		KK: "Оқу сауаттылығы",
		EN: "Reading literacy",
	},
}

var (
	topicNamesMu sync.RWMutex
	topicNames   = map[string]map[string]string{}
)

// RegisterTopicName adds a section or subtopic display name (ru is the canonical DB key).
func RegisterTopicName(ru, kk, en string) {
	ru = strings.TrimSpace(ru)
	if ru == "" {
		return
	}
	if kk == "" {
		kk = ru
	}
	if en == "" {
		en = ru
	}
	topicNamesMu.Lock()
	topicNames[ru] = map[string]string{RU: ru, KK: kk, EN: en}
	topicNamesMu.Unlock()
}

func TranslateSubjectName(name, loc string) string {
	loc = Normalize(loc)
	if loc == RU {
		return name
	}
	if m, ok := subjectNames[name]; ok {
		if t, ok := m[loc]; ok && t != "" {
			return t
		}
	}
	return name
}

func TranslateTopicName(name, loc string) string {
	name = strings.TrimSpace(name)
	loc = Normalize(loc)
	if loc == RU || name == "" {
		return name
	}
	topicNamesMu.RLock()
	m, ok := topicNames[name]
	topicNamesMu.RUnlock()
	if ok {
		if t, ok := m[loc]; ok && t != "" {
			return t
		}
	}
	return name
}

func AllSubjectKeys() []string {
	return []string{
		"История Казахстана",
		"Математическая грамотность",
		"Грамотность чтения",
	}
}

func ReadingPassagePrefix(loc string) string {
	switch Normalize(loc) {
	case KK:
		return "Оқу мәтіні:\n\n"
	case EN:
		return "Reading passage:\n\n"
	default:
		return "Текст для чтения:\n\n"
	}
}
