/** Pure local calculation. Never parse or execute a model-supplied expression. */
export type StudyInputs = { dailyMinutes: number; daysPerWeek: number; weeks: number }

export function calculateLearningMinutes(values: StudyInputs): number {
  const { dailyMinutes, daysPerWeek, weeks } = values
  if (!Number.isInteger(dailyMinutes) || dailyMinutes < 5 || dailyMinutes > 120 || dailyMinutes % 5 !== 0 ||
      !Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7 ||
      !Number.isInteger(weeks) || weeks < 1 || weeks > 12)
    throw new Error("Érvénytelen tanulási idő adatok.")
  return dailyMinutes * daysPerWeek * weeks
}
