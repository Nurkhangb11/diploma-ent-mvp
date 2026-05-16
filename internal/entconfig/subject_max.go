package entconfig

// SubjectENTMax — максимум баллов ЕНТ по каждому предмету в тренажёре.
var SubjectENTMax = map[string]int{
	"История Казахстана":         20,
	"Математическая грамотность": 10,
	"Грамотность чтения":         10,
}

// MaxPoints returns the ENT max score for a subject.
func MaxPoints(subjectName string) int {
	if v, ok := SubjectENTMax[subjectName]; ok {
		return v
	}
	return 20
}
