/** ENT max per subject — must match internal/entconfig/subject_max.go */
export const SUBJECT_MAX = {
  'История Казахстана': 20,
  'Математическая грамотность': 10,
  'Грамотность чтения': 10,
}

export function subjectMaxScore(subjectName) {
  return SUBJECT_MAX[subjectName] ?? 20
}

export function predictionSubjectMax(prediction, subjectName) {
  return prediction?.max_score ?? subjectMaxScore(subjectName)
}
