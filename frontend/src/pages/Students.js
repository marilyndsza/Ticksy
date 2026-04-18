import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  DAY_TOGGLE_LABELS,
  DAYS,
  DAYS_SHORT,
  WEEKLY_DAYS,
  getModeBadgeLabel,
  formatSelectedDays,
  normalizeSelectedDays,
} from '../lib/studentSchedule'
import { ArrowLeft, ChevronDown, Plus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog'

const getMissingColumnName = (error) => {
  const match = error?.message?.match(/Could not find the '([^']+)' column/)
  return match?.[1] || null
}

const downgradeStudentPayload = (payload, missingColumn) => {
  const next = { ...payload }

  if (missingColumn === 'selected_days' && Array.isArray(next.selected_days)) {
    next.alternate_days = next.selected_days
    if (next.mode === 'custom') next.mode = 'alternate'
  }

  delete next[missingColumn]
  return next
}

const saveStudentWithFallback = async ({ payload, existingStudentId }) => {
  let currentPayload = { ...payload }
  const skippedColumns = []

  while (true) {
    const query = existingStudentId
      ? supabase.from('students').update(currentPayload).eq('id', existingStudentId)
      : supabase.from('students').insert(currentPayload)

    const { error } = await query

    if (!error) {
      return { skippedColumns }
    }

    const missingColumn = getMissingColumnName(error)
    if (!missingColumn || !(missingColumn in currentPayload)) {
      throw error
    }

    skippedColumns.push(missingColumn)
    currentPayload = downgradeStudentPayload(currentPayload, missingColumn)
  }
}

function DaySelector({ value, onChange }) {
  const toggleDay = (day) => {
    const next = value.includes(day)
      ? value.filter((item) => item !== day)
      : [...value, day]
    onChange(normalizeSelectedDays(next))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Select Days</label>
      <div id="daysel" className="grid grid-cols-7 gap-2">
        {DAY_TOGGLE_LABELS.map((label, index) => {
          const selected = value.includes(index)
          return (
            <button
              key={`${label}-${index}`}
              type="button"
              onClick={() => toggleDay(index)}
              className={`h-11 rounded-2xl border text-sm font-body font-bold transition-colors ${
                selected
                  ? 'border-ticksy-blue bg-ticksy-blue text-white'
                  : 'border-ticksy-navy/10 bg-white text-ticksy-navy'
              }`}
              aria-label={DAYS_SHORT[index]}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const formatDisplayDate = (value) => {
  if (!value) return ''
  const [year, month, day] = String(value).split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

export default function Students() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [batches, setBatches] = useState([])
  const [studentSlots, setStudentSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [name, setName] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [dateJoined, setDateJoined] = useState('')
  const [age, setAge] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [feeAmount, setFeeAmount] = useState('')
  const [mode, setMode] = useState('weekly')
  const [selectedDays, setSelectedDays] = useState(WEEKLY_DAYS)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchStudents()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStudents = async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (!fetchError) setStudents(data || [])

    const { data: batchData } = await supabase
      .from('slots')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    setBatches(batchData || [])

    const { data: slotLinks } = await supabase
      .from('student_slots')
      .select('student_id, slot_id')

    setStudentSlots(slotLinks || [])
    setLoading(false)
  }

  const groupedStudents = useMemo(() => {
    const linksByStudent = studentSlots.reduce((acc, link) => {
      if (!acc[link.student_id]) acc[link.student_id] = []
      acc[link.student_id].push(link.slot_id)
      return acc
    }, {})

    const groups = batches.map((batch) => ({
      ...batch,
      students: students.filter((student) => (linksByStudent[student.id] || []).includes(batch.id)),
    })).filter((group) => group.students.length > 0)

    const assignedStudentIds = new Set(groups.flatMap((group) => group.students.map((student) => student.id)))
    const unassignedStudents = students.filter((student) => !assignedStudentIds.has(student.id))

    if (unassignedStudents.length > 0) {
      groups.push({
        id: 'unassigned',
        title: 'Unassigned Students',
        day_of_week: null,
        start_time: null,
        students: unassignedStudents,
      })
    }

    return groups
  }, [batches, studentSlots, students])

  const formatBatchTime = (batch) => {
    if (batch.day_of_week === null) return 'Not assigned to a batch yet'
    const [h, m] = (batch.start_time || '').split(':')
    const hour = Number(h)
    const displayHour = hour % 12 || 12
    const suffix = hour >= 12 ? 'PM' : 'AM'
    return `${DAYS[batch.day_of_week]} · ${displayHour}:${m} ${suffix}`
  }

  const resetForm = () => {
    setName('')
    setMedicalHistory('')
    setDateJoined('')
    setAge('')
    setPaymentMode('cash')
    setFeeAmount('')
    setMode('weekly')
    setSelectedDays(WEEKLY_DAYS)
    setError('')
  }

  const openAdd = () => {
    setEditingStudent(null)
    resetForm()
    setNotice('')
    setDialogOpen(true)
  }

  const openEdit = (student) => {
    setEditingStudent(student)
    setName(student.name)
    setMedicalHistory(student.medical_history || '')
    setDateJoined(student.date_joined || '')
    setAge(student.age != null ? String(student.age) : '')
    setPaymentMode(student.payment_mode || 'cash')
    setFeeAmount(student.fee_amount != null ? String(student.fee_amount) : '')
    setMode(student.mode === 'alternate' ? 'custom' : (student.mode || 'weekly'))
    setSelectedDays(
      normalizeSelectedDays(
        student.selected_days || student.alternate_days || ((student.mode === 'custom' || student.mode === 'alternate') ? [] : WEEKLY_DAYS)
      )
    )
    setError('')
    setNotice('')
    setDialogOpen(true)
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setError('')
    if (nextMode === 'weekly') {
      setSelectedDays(WEEKLY_DAYS)
    } else if (selectedDays.length === 0) {
      setSelectedDays([1])
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const normalizedDays = mode === 'weekly' ? WEEKLY_DAYS : normalizeSelectedDays(selectedDays)

    if (mode === 'custom' && normalizedDays.length === 0) {
      setError('Choose at least one day.')
      return
    }

    setError('')
    setSaving(true)
    let schemaFallbackNotice = ''

    const payload = {
      name: name.trim(),
      medical_history: medicalHistory.trim() || null,
      date_joined: dateJoined || null,
      age: age.trim() ? Number(age) : null,
      payment_mode: paymentMode || null,
      fee_amount: feeAmount.trim() ? Number(feeAmount) : null,
      mode,
      selected_days: normalizedDays,
    }

    try {
      if (editingStudent) {
        const { skippedColumns } = await saveStudentWithFallback({
          payload,
          existingStudentId: editingStudent.id,
        })

        if (skippedColumns.length > 0) {
          schemaFallbackNotice = 'Student was updated, but some optional details could not be saved to Supabase yet.'
        }
      } else {
        const { skippedColumns } = await saveStudentWithFallback({
          payload: { ...payload, user_id: user.id },
          existingStudentId: null,
        })

        if (skippedColumns.length > 0) {
          schemaFallbackNotice = 'Student was added, but some optional details could not be saved to Supabase yet.'
        }
      }

      setDialogOpen(false)
      setNotice(schemaFallbackNotice)
      fetchStudents()
    } catch (saveError) {
      console.error('Failed to save student', saveError)
      setError(saveError.message || 'Could not save student right now.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingStudent) return
    if (!window.confirm(`Delete ${editingStudent.name}?`)) return

    setSaving(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', editingStudent.id)

      if (deleteError) throw deleteError

      setDialogOpen(false)
      fetchStudents()
    } catch (deleteStudentError) {
      console.error('Failed to delete student', deleteStudentError)
      setError(deleteStudentError.message || 'Could not delete student right now.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div data-testid="students-page" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            data-testid="students-back-btn"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full bg-white border border-ticksy-navy/10 text-ticksy-navy flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4]">Students</h1>
        </div>
        <button
          data-testid="add-student-btn"
          onClick={openAdd}
          className="ticksy-btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {notice && (
        <p className="text-sm font-body text-amber-600">{notice}</p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ticksy-card animate-pulse h-16" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="ticksy-card text-center py-12">
          <p className="font-heading text-lg font-bold text-ticksy-navy/50">No students yet</p>
          <p className="font-body text-ticksy-navy/40 text-sm mt-1">Add your first student to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedStudents.map((group) => (
            <section key={group.id} className="space-y-3">
              <div className="px-1">
                <p className="font-heading text-lg font-bold text-ticksy-navy">{group.title}</p>
                <p className="font-body text-xs text-ticksy-navy/50 mt-1">{formatBatchTime(group)}</p>
              </div>

              {group.students.map((student) => (
                <button
                  key={`${group.id}-${student.id}`}
                  data-testid={`student-row-${student.id}`}
                  onClick={() => openEdit(student)}
                  className="ticksy-card w-full flex items-center gap-3 text-left transition-colors hover:bg-white"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-200 text-pink-800 flex items-center justify-center font-heading font-bold text-sm">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-ticksy-navy truncate">
                      {student.name}
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-body font-bold text-blue-700">
                        {getModeBadgeLabel(student)}
                      </span>
                    </p>
                    {(student.mode === 'custom' || student.mode === 'alternate') && (
                      <p className="font-body text-xs text-ticksy-navy/50 mt-1">
                        {formatSelectedDays(student)}
                      </p>
                    )}
                    {student.medical_history && (
                      <p className="font-body text-xs text-ticksy-navy/50 mt-1 truncate">
                        Medical: {student.medical_history}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {student.age != null && (
                        <p className="font-body text-xs text-ticksy-navy/50">
                          Age: {student.age}
                        </p>
                      )}
                      {student.date_joined && (
                        <p className="font-body text-xs text-ticksy-navy/50">
                          Joined: {formatDisplayDate(student.date_joined)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </section>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[24px] border-2 border-ticksy-navy bg-white p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ticksy-navy">
              {editingStudent ? 'Edit Student' : 'Add Student'}
            </DialogTitle>
            <DialogDescription className="font-body text-ticksy-navy/60">
              Update the student details and attendance schedule.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-2 space-y-4 pb-2">
            <div>
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Name</label>
              <input
                data-testid="student-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="ticksy-input mt-1"
                placeholder="Student name"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Medical History</label>
              <textarea
                data-testid="student-medical-history-input"
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                className="ticksy-input mt-1 min-h-[96px] resize-none rounded-[24px] py-3"
                placeholder="Optional notes, allergies, injuries, or anything important to remember"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Date Joined</label>
                <input
                  type="date"
                  value={dateJoined}
                  onChange={(e) => setDateJoined(e.target.value)}
                  className="ticksy-input mt-1"
                  placeholder="dd/mm/yyyy"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Age</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="ticksy-input mt-1"
                  placeholder="45"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Payment Mode</label>
                <div className="relative mt-1">
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full appearance-none rounded-[18px] border-2 border-ticksy-blue/20 bg-[linear-gradient(135deg,#F7FBFF_0%,#EEF4FF_100%)] px-4 py-3 pr-10 text-sm font-body font-semibold text-ticksy-navy shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition-all focus:border-ticksy-blue focus:ring-2 focus:ring-ticksy-blue/15"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ticksy-blue" />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Amount</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  className="ticksy-input mt-1"
                  placeholder="2500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Mode</label>

              <button
                type="button"
                onClick={() => handleModeChange('weekly')}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                  mode === 'weekly' ? 'border-ticksy-blue bg-blue-50' : 'border-ticksy-navy/10 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full border-2 ${mode === 'weekly' ? 'border-ticksy-blue bg-ticksy-blue' : 'border-ticksy-navy/20'}`} />
                  <div>
                    <p className="font-body font-semibold text-ticksy-navy">Weekly</p>
                    <p className="font-body text-xs text-ticksy-navy/50">Mon to Fri</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('custom')}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                  mode === 'custom' ? 'border-ticksy-blue bg-blue-50' : 'border-ticksy-navy/10 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full border-2 ${mode === 'custom' ? 'border-ticksy-blue bg-ticksy-blue' : 'border-ticksy-navy/20'}`} />
                  <div>
                    <p className="font-body font-semibold text-ticksy-navy">Custom</p>
                    <p className="font-body text-xs text-ticksy-navy/50">Choose specific days</p>
                  </div>
                </div>
              </button>
            </div>

            {mode === 'custom' && (
              <DaySelector value={selectedDays} onChange={setSelectedDays} />
            )}

            {error && (
              <p className="text-sm font-body text-red-500 text-center">{error}</p>
            )}

            <button
              data-testid="student-save-btn"
              type="submit"
              disabled={saving}
              className="ticksy-btn-primary w-full"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            {editingStudent && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full py-2 text-sm font-body font-semibold text-red-500"
              >
                Delete Student
              </button>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
