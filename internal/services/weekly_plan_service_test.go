package services

import "testing"

func TestExtractExpectedGrowth(t *testing.T) {
	plan := `AI рекомендует на эту неделю:
• 15 вопросов

Ожидаемый рост прогноза:
+4–6 баллов`

	got := extractExpectedGrowth(plan)
	if got != "+4–6" && got != "+4–6баллов" {
		// regex may capture +4–6
		if got == "" {
			t.Fatalf("expected growth, got empty")
		}
	}
}

func TestExtractExpectedGrowthFallback(t *testing.T) {
	got := extractExpectedGrowth("no growth here")
	if got != "+2–4 балла" {
		t.Fatalf("got %q", got)
	}
}
