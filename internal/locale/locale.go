package locale

import (
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	RU = "ru"
	KK = "kk"
	EN = "en"
)

var supported = map[string]struct{}{RU: {}, KK: {}, EN: {}}

func Normalize(raw string) string {
	raw = strings.ToLower(strings.TrimSpace(raw))
	if raw == "kz" || raw == "kaz" {
		raw = KK
	}
	if _, ok := supported[raw]; ok {
		return raw
	}
	return RU
}

func Parse(c *gin.Context) string {
	if q := c.Query("lang"); q != "" {
		return Normalize(q)
	}
	if q := c.Query("locale"); q != "" {
		return Normalize(q)
	}
	if h := c.GetHeader("Accept-Language"); h != "" {
		parts := strings.Split(h, ",")
		if len(parts) > 0 {
			lang := strings.Split(strings.TrimSpace(parts[0]), ";")[0]
			lang = strings.Split(lang, "-")[0]
			return Normalize(lang)
		}
	}
	return RU
}

func LanguageName(locale string) string {
	switch Normalize(locale) {
	case KK:
		return "казахский"
	case EN:
		return "английский"
	default:
		return "русский"
	}
}

func LanguageNameEN(locale string) string {
	switch Normalize(locale) {
	case KK:
		return "Kazakh"
	case EN:
		return "English"
	default:
		return "Russian"
	}
}
