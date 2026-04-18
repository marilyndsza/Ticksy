export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_TOGGLE_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
export const WEEKLY_DAYS = [1, 2, 3, 4, 5]

const isCustomMode = (mode) => mode === 'custom' || mode === 'alternate'

export const normalizeSelectedDays = (days = []) =>
  [...new Set((days || []).map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => a - b)

export const getStudentSelectedDays = (student) => {
  const selectedDays = normalizeSelectedDays(student?.selected_days || student?.alternate_days)
  if (selectedDays.length > 0) return selectedDays
  if (isCustomMode(student?.mode)) return []
  return WEEKLY_DAYS
}

export const attendsOnDay = (student, dayOfWeek) =>
  getStudentSelectedDays(student).includes(dayOfWeek)

export const formatSelectedDays = (student) => {
  const days = getStudentSelectedDays(student)
  if (days.length === 0) return 'No days selected'
  return days.map((day) => DAYS_SHORT[day]).join(', ')
}

export const getModeBadgeLabel = (student) =>
  isCustomMode(student?.mode) ? 'C' : 'D'

export const getModeLabel = (student) =>
  isCustomMode(student?.mode) ? 'Custom' : 'Daily'

export const getAgeFromBirthday = (birthday) => {
  if (!birthday) return null
  const [year, month, day] = String(birthday).split('-').map(Number)
  if (!year || !month || !day) return null

  const today = new Date()
  let age = today.getFullYear() - year
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day)

  if (!hasHadBirthdayThisYear) age -= 1
  return age >= 0 ? age : null
}

// Backward-compatible aliases so hot-reloaded modules using the old naming
// don't crash while the dev server refreshes.
export const normalizeAlternateDays = normalizeSelectedDays
export const attendsSlotDay = attendsOnDay
export const formatAlternateDays = formatSelectedDays
