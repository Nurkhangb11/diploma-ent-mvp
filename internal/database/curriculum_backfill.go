package database

import (
	"diploma-ent-mvp/internal/i18n"
	"diploma-ent-mvp/internal/locale"
	"diploma-ent-mvp/internal/models"
	"encoding/json"
	"log"
	"os"
	"strings"
)

func BackfillCurriculumI18n() {
	raw, err := os.ReadFile("internal/database/curriculum_i18n.json")
	if err != nil {
		log.Printf("Curriculum i18n file skipped: %v", err)
		loadCurriculumFromDB()
		return
	}

	catalog, err := i18n.ParseCurriculumCatalog(raw)
	if err != nil {
		log.Printf("Curriculum i18n parse error: %v", err)
		loadCurriculumFromDB()
		return
	}

	registerCatalog(catalog)
	backfillSectionSubtopicColumns(catalog)
	loadCurriculumFromDB()
	log.Println("Curriculum i18n backfill completed")
}

func registerCatalog(c i18n.CurriculumCatalog) {
	for ru, loc := range c.Sections {
		locale.RegisterTopicName(ru, loc.KK, loc.EN)
	}
	for ru, loc := range c.Subtopics {
		locale.RegisterTopicName(ru, loc.KK, loc.EN)
	}
}

func backfillSectionSubtopicColumns(c i18n.CurriculumCatalog) {
	var sections []models.Section
	if err := DB.Find(&sections).Error; err != nil {
		return
	}
	for _, s := range sections {
		if loc, ok := c.Sections[s.Name]; ok {
			payload := i18n.SerializeNameI18n(s.Name, loc)
			if s.NameI18n != payload {
				_ = DB.Model(&s).Update("name_i18n", payload).Error
			}
		}
	}

	var subtopics []models.Subtopic
	if err := DB.Find(&subtopics).Error; err != nil {
		return
	}
	for _, st := range subtopics {
		if loc, ok := c.Subtopics[st.Name]; ok {
			payload := i18n.SerializeNameI18n(st.Name, loc)
			if st.NameI18n != payload {
				_ = DB.Model(&st).Update("name_i18n", payload).Error
			}
		}
	}
}

func loadCurriculumFromDB() {
	var sections []models.Section
	_ = DB.Find(&sections).Error
	for _, s := range sections {
		registerRow(s.Name, s.NameI18n)
	}

	var subtopics []models.Subtopic
	_ = DB.Find(&subtopics).Error
	for _, st := range subtopics {
		registerRow(st.Name, st.NameI18n)
	}
}

func registerRow(ru, nameI18n string) {
	ru = strings.TrimSpace(ru)
	if ru == "" || strings.TrimSpace(nameI18n) == "" {
		return
	}
	var m map[string]string
	if err := json.Unmarshal([]byte(nameI18n), &m); err != nil {
		return
	}
	locale.RegisterTopicName(ru, m["kk"], m["en"])
}
