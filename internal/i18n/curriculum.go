package i18n

import (
	"encoding/json"
	"strings"
)

// NameLocales holds localized display names (Russian is the DB key).
type NameLocales struct {
	KK string `json:"kk"`
	EN string `json:"en"`
}

// CurriculumCatalog maps Russian canonical names to kk/en labels.
type CurriculumCatalog struct {
	Sections  map[string]NameLocales `json:"sections"`
	Subtopics map[string]NameLocales `json:"subtopics"`
}

func ParseCurriculumCatalog(raw []byte) (CurriculumCatalog, error) {
	var c CurriculumCatalog
	if err := json.Unmarshal(raw, &c); err != nil {
		return CurriculumCatalog{}, err
	}
	if c.Sections == nil {
		c.Sections = map[string]NameLocales{}
	}
	if c.Subtopics == nil {
		c.Subtopics = map[string]NameLocales{}
	}
	return c, nil
}

// SerializeNameI18n stores ru/kk/en in DB column.
func SerializeNameI18n(ru string, loc NameLocales) string {
	m := map[string]string{
		"ru": strings.TrimSpace(ru),
		"kk": strings.TrimSpace(loc.KK),
		"en": strings.TrimSpace(loc.EN),
	}
	if m["kk"] == "" {
		m["kk"] = m["ru"]
	}
	if m["en"] == "" {
		m["en"] = m["ru"]
	}
	b, _ := json.Marshal(m)
	return string(b)
}

func LocalizedName(nameI18n, ruFallback, loc string) string {
	ruFallback = strings.TrimSpace(ruFallback)
	if loc == "ru" || loc == "" {
		return ruFallback
	}
	if strings.TrimSpace(nameI18n) == "" {
		return ruFallback
	}
	var m map[string]string
	if err := json.Unmarshal([]byte(nameI18n), &m); err != nil {
		return ruFallback
	}
	if v := strings.TrimSpace(m[loc]); v != "" {
		return v
	}
	if v := strings.TrimSpace(m["ru"]); v != "" {
		return v
	}
	return ruFallback
}
