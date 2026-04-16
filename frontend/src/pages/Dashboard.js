import { useMemo, useState, useEffect, useRef } from 'react'
import { createWorker } from 'tesseract.js'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import { supabase } from '../lib/supabase'
import { attendsOnDay } from '../lib/studentSchedule'
import { ChevronRight, Clock, ImagePlus, Pin, Trash2, Users, X } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const BULLET_PATTERN = /^[•●○◦▪■◆◇★☆*·●®]/u
const DATE_PATTERN = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/
const CONTINUATION_CONNECTOR_PATTERN = /\b(with|and|or|to|for|of|in|on|into|from|using)$/i

const toIsoDate = (day, month, year) => {
  const normalizedYear = year.length === 2 ? `20${year}` : year
  const iso = `${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return Number.isNaN(new Date(`${iso}T00:00:00`).getTime()) ? '' : iso
}

const extractWorkoutDate = (text = '') => {
  const match = text.match(DATE_PATTERN)
  if (!match) return ''
  const [, day, month, year] = match
  return toIsoDate(day, month, year)
}

const sanitizeChecklistLine = (line = '') =>
  line
    .replace(BULLET_PATTERN, '')
    .replace(/^[\d\-\.\)\s]+/, '')
    .replace(/^Date[:\s-]*/i, '')
    .trim()

const isLikelyHeaderLine = (line = '') => {
  const lower = line.toLowerCase()
  const compact = lower.replace(/[^a-z]/g, '')
  return (
    DATE_PATTERN.test(line) ||
    lower.startsWith('date') ||
    lower.includes('fitness') ||
    lower.includes('souls') ||
    lower.includes('soulz') ||
    lower.includes('hussain') ||
    lower.includes('luva') ||
    /so+u?l/.test(compact) ||
    compact.includes('soul') ||
    compact.includes('fitness') ||
    compact.includes('iness') ||
    compact === 'ee' ||
    compact === 'einess' ||
    lower === 'by' ||
    lower.length <= 1
  )
}

const shouldJoinContinuation = (previous = '', current = '') => {
  if (!previous || !current) return false
  if (current.toLowerCase() === 'rest') return false
  return CONTINUATION_CONNECTOR_PATTERN.test(previous.trim())
}

const combineContinuationLines = (lines = []) => lines.reduce((combined, line) => {
  if (combined.length > 0 && shouldJoinContinuation(combined[combined.length - 1], line)) {
    const previous = combined[combined.length - 1]
    combined[combined.length - 1] = `${previous} ${line}`.replace(/\s+/g, ' ').trim()
    return combined
  }

  combined.push(line)
  return combined
}, [])

const parseChecklistLines = (text = '') => {
  const rawLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const dateLineIndex = rawLines.findIndex((line) => DATE_PATTERN.test(line))
  const workoutLines = dateLineIndex >= 0 ? rawLines.slice(dateLineIndex + 1) : rawLines

  const hasBullets = workoutLines.some((line) => BULLET_PATTERN.test(line))
  if (hasBullets) {
    const combinedBulletLines = []

    workoutLines.forEach((line) => {
      const cleaned = sanitizeChecklistLine(line)
      if (!cleaned || isLikelyHeaderLine(cleaned)) return

      if (BULLET_PATTERN.test(line)) {
        combinedBulletLines.push(cleaned)
        return
      }

      if (combinedBulletLines.length > 0) {
        const previous = combinedBulletLines[combinedBulletLines.length - 1]
        combinedBulletLines[combinedBulletLines.length - 1] = `${previous} ${cleaned}`.replace(/\s+/g, ' ').trim()
      }
    })

    return combinedBulletLines.filter((line) => line.length > 1)
  }

  const cleanedLines = workoutLines
    .map(sanitizeChecklistLine)
    .filter((line) => line.length > 1 && !isLikelyHeaderLine(line))

  return combineContinuationLines(cleanedLines)
}

const formatDateLabel = (value) => {
  if (!value) return 'No date set'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatChecklistTitle = (checklist) =>
  formatDateLabel(checklist.workout_date || checklist.created_at?.split('T')[0])

function WorkoutChecklistCard({ checklist, onToggleItem, onDeleteChecklist, onToggleKeep, onReviewChecklist }) {
  const items = Array.isArray(checklist.checklist_items) ? checklist.checklist_items : []
  const completed = items.filter((item) => item.done).length

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-transparent bg-[linear-gradient(135deg,#2443C5_0%,#6F8CFF_38%,#F3BDD8_100%)] p-[1.5px] shadow-[0_16px_34px_rgba(43,79,200,0.16)]">
      <div className="pointer-events-none absolute inset-0 opacity-100">
        <div className="absolute -left-12 top-4 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(124,164,255,0.5)_0%,rgba(124,164,255,0.18)_42%,transparent_74%)] blur-2xl" />
        <div className="absolute right-6 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(246,189,216,0.44)_0%,rgba(246,189,216,0.14)_44%,transparent_74%)] blur-2xl" />
        <div className="absolute bottom-2 left-1/2 h-24 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.16)_38%,transparent_74%)] blur-2xl" />
      </div>
      <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,rgba(244,249,255,0.97)_0%,rgba(229,239,255,0.98)_34%,rgba(255,239,247,0.9)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.38)_10%,rgba(255,255,255,0.08)_30%,rgba(140,181,255,0.1)_58%,rgba(246,189,216,0.1)_86%)]" />
        <div className="pointer-events-none absolute -left-8 top-6 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(91,142,255,0.32)_0%,rgba(91,142,255,0.08)_44%,transparent_76%)] blur-xl" />
        <div className="pointer-events-none absolute right-10 top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.66)_0%,rgba(255,255,255,0.14)_44%,transparent_76%)] blur-xl" />
        <div className="pointer-events-none absolute bottom-4 right-16 h-28 w-36 rounded-full bg-[radial-gradient(circle,rgba(247,201,223,0.26)_0%,rgba(247,201,223,0.08)_44%,transparent_76%)] blur-xl" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-lg font-bold text-ticksy-navy">
            {formatChecklistTitle(checklist)}
          </p>
          <p className="font-body text-sm text-ticksy-navy/75 mt-1">
            {completed}/{items.length} completed
          </p>
          <p className="font-body text-xs text-ticksy-navy/45 mt-1">
            Workout date: {formatDateLabel(checklist.workout_date || checklist.created_at?.split('T')[0])}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => onToggleKeep(checklist)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-body font-semibold ${
              checklist.keep_forever
                ? 'bg-[#DCE8FF] text-ticksy-blue'
                : 'bg-white text-ticksy-navy/70'
            }`}
          >
            <Pin size={12} />
            {checklist.keep_forever ? 'Kept' : 'Keep'}
          </button>
          <button
            type="button"
            onClick={() => onReviewChecklist(checklist)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-body font-semibold text-ticksy-navy/75"
          >
            Review
          </button>
          <button
            type="button"
            onClick={() => onDeleteChecklist(checklist.id)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-body font-semibold text-red-500"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item, itemIndex) => (
          <button
            key={`${checklist.id}-${itemIndex}`}
            onClick={() => onToggleItem(checklist, itemIndex)}
            className="w-full flex items-start gap-3 rounded-2xl bg-white/90 px-3 py-3 text-left hover:bg-white transition-colors"
          >
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
              item.done ? 'border-ticksy-blue bg-ticksy-blue text-white' : 'border-ticksy-navy/25 bg-white'
            }`}>
              {item.done ? '✓' : ''}
            </div>
            <span className={`font-body text-sm ${item.done ? 'text-ticksy-navy/45 line-through' : 'text-ticksy-navy'}`}>
              {item.text}
            </span>
          </button>
        ))}
      </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, getDisplayName } = useAuth()
  const { setNavbarHidden } = useUI()
  const navigate = useNavigate()
  const [todaySlots, setTodaySlots] = useState([])
  const [studentCounts, setStudentCounts] = useState({})
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')
  const [checklistText, setChecklistText] = useState('')
  const [sourceImageName, setSourceImageName] = useState('')
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0])
  const [dragActive, setDragActive] = useState(false)
  const [reviewChecklist, setReviewChecklist] = useState(null)
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [savingReview, setSavingReview] = useState(false)
  const reviewInputRefs = useRef([])
  const today = new Date()
  const dayOfWeek = today.getDay()
  const sevenDayCutoff = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return cutoff.toISOString()
  }, [])

  useEffect(() => {
    if (!user) return
    fetchTodaySlots()
    fetchChecklists()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setNavbarHidden(showUpload || Boolean(reviewChecklist))
    return () => setNavbarHidden(false)
  }, [showUpload, reviewChecklist, setNavbarHidden])

  const fetchTodaySlots = async () => {
    if (!user) return
    setLoading(true)
    const { data: slots, error } = await supabase
      .from('slots')
      .select('*')
      .eq('user_id', user.id)
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true })

    if (!error && slots) {
      setTodaySlots(slots)
      const counts = {}
      for (const slot of slots) {
        const { data: studentSlots } = await supabase
          .from('student_slots')
          .select('student_id, students(id)')
          .eq('slot_id', slot.id)
        counts[slot.id] = (studentSlots || [])
          .map((entry) => entry.students)
          .filter(Boolean)
          .filter((student) => attendsOnDay(student, slot.day_of_week)).length
      }
      setStudentCounts(counts)
    }
    setLoading(false)
  }

  const fetchChecklists = async () => {
    await supabase
      .from('notes')
      .delete()
      .eq('user_id', user.id)
      .eq('kind', 'checklist')
      .eq('keep_forever', false)
      .lte('created_at', sevenDayCutoff)

    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('kind', 'checklist')
      .order('created_at', { ascending: false })
    setChecklists(data || [])
  }

  const resetChecklistComposer = () => {
    setChecklistText('')
    setSourceImageName('')
    setOcrError('')
    setWorkoutDate(new Date().toISOString().split('T')[0])
    setDragActive(false)
  }

  const extractWorkoutImage = async (file) => {
    if (!file) return

    setOcrLoading(true)
    setOcrError('')
    setSourceImageName(file.name)

    try {
      const worker = await createWorker('eng')
      const { data } = await worker.recognize(file)
      await worker.terminate()

      const lines = parseChecklistLines(data.text)
      const detectedWorkoutDate = extractWorkoutDate(data.text)
      if (lines.length === 0) {
        setOcrError('I could not find clear workout lines in that image. Try a clearer screenshot or edit the text after upload.')
        setChecklistText('')
        return
      }

      setChecklistText(lines.join('\n'))
      if (detectedWorkoutDate) {
        setWorkoutDate(detectedWorkoutDate)
      }
    } catch (error) {
      console.error('Failed to extract workout text', error)
      setOcrError('Could not read that image. Please try a clearer screenshot or photo.')
    } finally {
      setOcrLoading(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    await extractWorkoutImage(file)
    event.target.value = ''
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    await extractWorkoutImage(file)
  }

  const handleCreateChecklist = async () => {
    const items = parseChecklistLines(checklistText).map((text) => ({ text, done: false }))
    if (items.length === 0) return

    setSavingChecklist(true)
    setOcrError('')

    const checklistDate = workoutDate || new Date().toISOString().split('T')[0]
    const newChecklist = {
      title: formatDateLabel(checklistDate),
      content: `Checklist with ${items.length} items`,
      kind: 'checklist',
      checklist_items: items,
      source_image_name: sourceImageName || null,
      workout_date: checklistDate,
      keep_forever: false,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('notes')
      .insert(newChecklist)
      .select('*')
      .single()

    setSavingChecklist(false)

    if (error) {
      console.error('Failed to create checklist', error)
      setOcrError(error.message || 'Could not save this checklist. Please check your Supabase notes table migration.')
      return
    }

    if (data) {
      setChecklists((prev) => [data, ...prev])
    }

    setShowUpload(false)
    resetChecklistComposer()
    fetchChecklists()
  }

  const handleToggleChecklistItem = async (checklist, itemIndex) => {
    const nextItems = (checklist.checklist_items || []).map((item, index) =>
      index === itemIndex ? { ...item, done: !item.done } : item
    )

    await supabase
      .from('notes')
      .update({ checklist_items: nextItems })
      .eq('id', checklist.id)

    setChecklists((prev) => prev.map((entry) => (
      entry.id === checklist.id ? { ...entry, checklist_items: nextItems } : entry
    )))
    if (reviewChecklist?.id === checklist.id) {
      setReviewChecklist((prev) => prev ? { ...prev, checklist_items: nextItems } : prev)
    }
  }

  const handleDeleteChecklist = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    setChecklists((prev) => prev.filter((entry) => entry.id !== id))
    if (reviewChecklist?.id === id) setReviewChecklist(null)
  }

  const handleToggleKeepChecklist = async (checklist) => {
    const nextKeep = !checklist.keep_forever
    await supabase
      .from('notes')
      .update({ keep_forever: nextKeep })
      .eq('id', checklist.id)

    setChecklists((prev) => prev.map((entry) => (
      entry.id === checklist.id ? { ...entry, keep_forever: nextKeep } : entry
    )))
    if (reviewChecklist?.id === checklist.id) {
      setReviewChecklist((prev) => prev ? { ...prev, keep_forever: nextKeep } : prev)
    }
  }

  const handleReviewItemTextChange = (itemIndex, value) => {
    setReviewChecklist((prev) => {
      if (!prev) return prev
      const nextItems = (prev.checklist_items || []).map((item, index) => (
        index === itemIndex ? { ...item, text: value } : item
      ))
      return { ...prev, checklist_items: nextItems }
    })
  }

  const handleSaveReviewChecklist = async () => {
    if (!reviewChecklist) return

    const nextItems = (reviewChecklist.checklist_items || [])
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text.length > 0)

    setSavingReview(true)
    await supabase
      .from('notes')
      .update({ checklist_items: nextItems })
      .eq('id', reviewChecklist.id)

    setChecklists((prev) => prev.map((entry) => (
      entry.id === reviewChecklist.id ? { ...entry, checklist_items: nextItems } : entry
    )))
    setReviewChecklist((prev) => prev ? { ...prev, checklist_items: nextItems } : prev)
    setSavingReview(false)
  }

  const handleReviewItemKeyDown = (event, itemIndex) => {
    if (event.key !== 'Enter') return

    event.preventDefault()

    const cursorPosition = event.currentTarget.selectionStart ?? reviewChecklist?.checklist_items?.[itemIndex]?.text.length ?? 0
    const currentText = reviewChecklist?.checklist_items?.[itemIndex]?.text || ''
    const beforeCursor = currentText.slice(0, cursorPosition).trim()
    const afterCursor = currentText.slice(cursorPosition).trim()

    setReviewChecklist((prev) => {
      if (!prev) return prev

      const nextItems = [...(prev.checklist_items || [])]
      nextItems[itemIndex] = { ...nextItems[itemIndex], text: beforeCursor }
      nextItems.splice(itemIndex + 1, 0, { text: afterCursor, done: false })

      return { ...prev, checklist_items: nextItems }
    })

    requestAnimationFrame(() => {
      reviewInputRefs.current[itemIndex + 1]?.focus()
    })
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4] tracking-tight">
          Hey there! {getDisplayName(user)}
        </h1>
        <p className="font-heading text-lg font-semibold tracking-wide text-ticksy-navy/70 mt-2">
          It&apos;s {DAYS[dayOfWeek]}, {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-ticksy-navy">Workout Checklists</h2>
            <p className="font-body text-sm text-ticksy-navy/55 mt-1">
              Upload a workout image here and turn it into a checklist you can tick off during class.
            </p>
            <p className="font-body text-xs text-ticksy-navy/45 mt-2">
              Unkept checklists are automatically cleared from the dashboard after 7 days. Keep anything you want to reuse.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-full bg-ticksy-blue px-4 py-2 text-sm font-body font-semibold text-white shadow-[0_6px_18px_rgba(43,79,200,0.25)]"
          >
            <ImagePlus size={16} />
            Workout Image
          </button>
        </div>

        {checklists.length === 0 ? (
          <div className="ticksy-card border-dashed !border-[#CFE0FF] bg-gradient-to-br from-white to-[#F5F9FF]">
            <p className="font-heading text-lg font-bold text-ticksy-navy">No workout checklist yet</p>
            <p className="font-body text-sm text-ticksy-navy/55 mt-2">
              Upload a class plan image and Ticksy will pull out the workout lines so you can check them off live.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {checklists.map((checklist) => (
              <WorkoutChecklistCard
                key={checklist.id}
                checklist={checklist}
                onToggleItem={handleToggleChecklistItem}
                onDeleteChecklist={handleDeleteChecklist}
                onToggleKeep={handleToggleKeepChecklist}
                onReviewChecklist={setReviewChecklist}
              />
            ))}
          </div>
        )}
      </section>

      <div>
        <h2 className="font-heading text-xl font-bold text-ticksy-navy mb-4">
          Today&apos;s Batches
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="ticksy-card animate-pulse h-24" />
            ))}
          </div>
        ) : todaySlots.length === 0 ? (
          <div className="ticksy-card text-center py-12">
            <Clock className="mx-auto text-ticksy-navy/30 mb-3" size={48} />
            <p className="font-heading text-lg font-bold text-ticksy-navy/50">
              No batches for today
            </p>
            <p className="font-body text-ticksy-navy/40 text-sm mt-1">
              {DAYS[dayOfWeek]}s are free! Go to Profile to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {todaySlots.map((slot) => (
              <button
                key={slot.id}
                data-testid={`slot-card-${slot.id}`}
                onClick={() => navigate(`/attendance/${slot.id}`)}
                className="ticksy-card w-full text-left flex items-center justify-between hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div>
                  <h3 className="font-heading text-lg font-bold text-ticksy-navy">
                    {slot.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 font-body text-sm text-ticksy-navy/60">
                      <Clock size={14} />
                      {formatTime(slot.start_time)}
                      {slot.end_time && ` – ${formatTime(slot.end_time)}`}
                    </span>
                    <span className="flex items-center gap-1 font-body text-sm text-ticksy-navy/60">
                      <Users size={14} />
                      {studentCounts[slot.id] || 0} students
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-ticksy-navy/40" size={24} />
              </button>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-20 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:items-center sm:py-6" onClick={() => setShowUpload(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white p-6 pb-8 shadow-[0_24px_80px_rgba(15,27,76,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-ticksy-navy">Create Workout Checklist</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <p className="font-body text-sm text-ticksy-navy/60">
              Upload a workout image and I&apos;ll turn the text into a checklist you can tick off on this page.
              Bullet points work best: each bullet becomes one checklist item, and wrapped lines stay attached.
            </p>

            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              className="w-full rounded-full border-2 bg-white px-4 py-3 text-ticksy-navy font-body text-sm mt-4"
              style={{ borderColor: 'rgba(15,27,76,0.15)' }}
            />

            <label
              onDrop={handleDrop}
              onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                dragActive
                  ? 'border-ticksy-blue bg-[#EAF3FF]'
                  : 'border-ticksy-blue/30 bg-[#F5F9FF]'
              }`}
            >
              <ImagePlus size={18} className="text-ticksy-blue" />
              <span className="font-body text-sm font-semibold text-ticksy-navy leading-relaxed">
                {ocrLoading ? 'Reading image...' : 'Choose workout image or drag it here'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {ocrError && (
              <p className="font-body text-sm text-red-500 mt-3">{ocrError}</p>
            )}

            <textarea
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
              placeholder="Each workout item should be on a new line"
              rows={7}
              className="w-full rounded-2xl border-2 bg-white px-4 py-3 text-ticksy-navy placeholder-slate-400 font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ticksy-blue/30 mt-4"
              style={{ borderColor: 'rgba(15,27,76,0.15)' }}
            />

            <button
              type="button"
              onClick={handleCreateChecklist}
              disabled={savingChecklist || parseChecklistLines(checklistText).length === 0}
              className="ticksy-btn-primary w-full mt-4"
            >
              {savingChecklist ? 'Saving...' : 'Create Checklist'}
            </button>
          </div>
        </div>
      )}

      {reviewChecklist && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-20 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:items-center sm:py-6" onClick={() => setReviewChecklist(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_24px_80px_rgba(15,27,76,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="font-heading text-xl font-bold text-ticksy-navy">{formatChecklistTitle(reviewChecklist)}</p>
                <p className="font-body text-sm text-ticksy-navy/55 mt-1">
                  Workout date: {formatDateLabel(reviewChecklist.workout_date || reviewChecklist.created_at?.split('T')[0])}
                </p>
              </div>
              <button
                onClick={() => setReviewChecklist(null)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleToggleKeepChecklist(reviewChecklist)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-body font-semibold ${
                  reviewChecklist.keep_forever
                    ? 'bg-[#DCE8FF] text-ticksy-blue'
                    : 'bg-slate-100 text-ticksy-navy/75'
                }`}
              >
                <Pin size={12} />
                {reviewChecklist.keep_forever ? 'Kept' : 'Keep'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteChecklist(reviewChecklist.id)}
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-body font-semibold text-red-500"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
              {(reviewChecklist.checklist_items || []).map((item, itemIndex) => (
                <div
                  key={`${reviewChecklist.id}-${itemIndex}`}
                  className="w-full rounded-2xl bg-[#F8FBFF] px-3 py-3"
                >
                  <input
                    type="text"
                    value={item.text}
                    ref={(node) => {
                      reviewInputRefs.current[itemIndex] = node
                    }}
                    onChange={(e) => handleReviewItemTextChange(itemIndex, e.target.value)}
                    onKeyDown={(e) => handleReviewItemKeyDown(e, itemIndex)}
                    className="w-full bg-transparent font-body text-sm text-ticksy-navy outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveReviewChecklist}
              disabled={savingReview}
              className="ticksy-btn-primary w-full mt-4"
            >
              {savingReview ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
