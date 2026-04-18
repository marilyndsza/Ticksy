import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  DAYS,
  DAY_TOGGLE_LABELS,
  DAYS_SHORT,
  WEEKLY_DAYS,
  getModeBadgeLabel,
  getAgeFromBirthday,
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
      : supabase.from('students').insert(currentPayload).select('id').single()

    const { data, error } = await query

    if (!error) {
      return { data, skippedColumns }
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

export default function BatchDetails() {
  const { slotId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [batch, setBatch] = useState(null)
  const [students, setStudents] = useState([])
  const [allStudents, setAllStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [existingStudentId, setExistingStudentId] = useState('')
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentMedicalHistory, setNewStudentMedicalHistory] = useState('')
  const [dateJoined, setDateJoined] = useState('')
  const [birthday, setBirthday] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [feeAmount, setFeeAmount] = useState('')
  const [mode, setMode] = useState('weekly')
  const [selectedDays, setSelectedDays] = useState(WEEKLY_DAYS)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editBatchOpen, setEditBatchOpen] = useState(false)
  const [batchTitle, setBatchTitle] = useState('')
  const [batchStartTime, setBatchStartTime] = useState('')
  const [batchEndTime, setBatchEndTime] = useState('')
  const [savingBatch, setSavingBatch] = useState(false)

  useEffect(() => {
    if (user && slotId) fetchData()
  }, [user, slotId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true)

    try {
      const { data: slotData, error: slotError } = await supabase
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .single()

      if (slotError) throw slotError
      setBatch(slotData)

      const { data: studentSlotRows, error: studentSlotsError } = await supabase
        .from('student_slots')
        .select('student_id')
        .eq('slot_id', slotId)

      if (studentSlotsError) throw studentSlotsError

      const studentIds = (studentSlotRows || []).map((entry) => entry.student_id).filter(Boolean)

      let batchStudents = []
      if (studentIds.length > 0) {
        const { data: enrolledStudents, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds)
          .order('name', { ascending: true })

        if (studentsError) throw studentsError
        batchStudents = enrolledStudents || []
      }

      setStudents(batchStudents)

      const { data: allStudentRows, error: allStudentsError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (allStudentsError) throw allStudentsError
      setAllStudents(allStudentRows || [])
    } catch (fetchError) {
      console.error('Failed to load batch details', fetchError)
      setError(fetchError.message || 'Could not load this batch right now.')
      setStudents([])
      setAllStudents([])
    } finally {
      setLoading(false)
    }
  }

  const unassignedStudents = useMemo(() => {
    const assignedIds = new Set(students.map((student) => student.id))
    return allStudents.filter((student) => !assignedIds.has(student.id))
  }, [students, allStudents])

  const resetStudentForm = () => {
    setEditingStudent(null)
    setExistingStudentId('')
    setNewStudentName('')
    setNewStudentMedicalHistory('')
    setDateJoined('')
    setBirthday('')
    setPaymentMode('cash')
    setFeeAmount('')
    setMode('weekly')
    setSelectedDays(WEEKLY_DAYS)
    setError('')
  }

  const openAddStudent = () => {
    resetStudentForm()
    setNotice('')
    setAddOpen(true)
  }

  const openEditBatch = () => {
    if (!batch) return
    setBatchTitle(batch.title || '')
    setBatchStartTime(batch.start_time || '')
    setBatchEndTime(batch.end_time || '')
    setError('')
    setNotice('')
    setEditBatchOpen(true)
  }

  const openEditStudent = (student) => {
    setEditingStudent(student)
    setExistingStudentId('')
    setNewStudentName(student.name || '')
    setNewStudentMedicalHistory(student.medical_history || '')
    setDateJoined(student.date_joined || '')
    setBirthday(student.birthday || '')
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
    setAddOpen(true)
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setError('')
    if (nextMode === 'weekly') {
      setSelectedDays(WEEKLY_DAYS)
    } else if (selectedDays.length === 0 && batch) {
      setSelectedDays([batch.day_of_week])
    }
  }

  const handleSelectExisting = (studentId) => {
    setExistingStudentId(studentId)
    setError('')
    if (!studentId) return

    const student = allStudents.find((item) => item.id === studentId)
    if (!student) return

    setNewStudentName('')
    setNewStudentMedicalHistory(student.medical_history || '')
    setDateJoined(student.date_joined || '')
    setBirthday(student.birthday || '')
    setPaymentMode(student.payment_mode || 'cash')
    setFeeAmount(student.fee_amount != null ? String(student.fee_amount) : '')
    setMode(student.mode === 'alternate' ? 'custom' : (student.mode || 'weekly'))
    setSelectedDays(
      normalizeSelectedDays(
        student.selected_days || student.alternate_days || ((student.mode === 'custom' || student.mode === 'alternate') ? [] : WEEKLY_DAYS)
      )
    )
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    const normalizedDays = mode === 'weekly' ? WEEKLY_DAYS : normalizeSelectedDays(selectedDays)

    if (mode === 'custom' && normalizedDays.length === 0) {
      setError('Choose at least one day.')
      return
    }

    setSaving(true)
    setError('')
    let studentId = editingStudent?.id || existingStudentId
    let schemaFallbackNotice = ''

    const studentPayload = {
      name: newStudentName.trim(),
      medical_history: newStudentMedicalHistory.trim() || null,
      date_joined: dateJoined || null,
      birthday: birthday || null,
      payment_mode: paymentMode || null,
      fee_amount: feeAmount.trim() ? Number(feeAmount) : null,
      mode,
      selected_days: normalizedDays,
    }

    try {
      if (!studentId) {
        const { data, skippedColumns } = await saveStudentWithFallback({
          payload: {
            user_id: user.id,
            ...studentPayload,
          },
          existingStudentId: null,
        })

        studentId = data?.id
        if (skippedColumns.length > 0) {
          schemaFallbackNotice = 'Student was added, but some optional details could not be saved to Supabase yet.'
        }
      } else {
        const { skippedColumns } = await saveStudentWithFallback({
          payload: studentPayload,
          existingStudentId: studentId,
        })

        if (skippedColumns.length > 0) {
          schemaFallbackNotice = 'Student was updated, but some optional details could not be saved to Supabase yet.'
        }
      }

      if (!studentId) {
        throw new Error('Student could not be created.')
      }

      const { error: linkError } = await supabase
        .from('student_slots')
        .upsert({
          student_id: studentId,
          slot_id: slotId,
          user_id: user.id,
        }, { onConflict: 'student_id,slot_id' })

      if (linkError) throw linkError

      setAddOpen(false)
      resetStudentForm()
      setNotice(schemaFallbackNotice)
      await fetchData()
    } catch (saveError) {
      console.error('Failed to save student to batch', saveError)
      setError(saveError.message || 'Could not save student right now.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBatch = async () => {
    if (!window.confirm('Delete this batch?')) return
    await supabase.from('slots').delete().eq('id', slotId)
    navigate('/profile')
  }

  const handleSaveBatch = async (e) => {
    e.preventDefault()
    if (!batch) return

    setSavingBatch(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('slots')
        .update({
          title: batchTitle.trim(),
          start_time: batchStartTime,
          end_time: batchEndTime || null,
        })
        .eq('id', batch.id)

      if (updateError) throw updateError

      setEditBatchOpen(false)
      await fetchData()
    } catch (updateBatchError) {
      console.error('Failed to update batch', updateBatchError)
      setError(updateBatchError.message || 'Could not update batch right now.')
    } finally {
      setSavingBatch(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!editingStudent) return
    if (!window.confirm(`Delete ${editingStudent.name}? This will remove them from your students list too.`)) return

    setSaving(true)
    setError('')

    try {
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', editingStudent.id)

      if (deleteError) throw deleteError

      setAddOpen(false)
      resetStudentForm()
      await fetchData()
    } catch (deleteStudentError) {
      console.error('Failed to delete student', deleteStudentError)
      setError(deleteStudentError.message || 'Could not delete student right now.')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = Number(h)
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  if (loading) {
    return <div className="ticksy-card animate-pulse h-56" />
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-white border border-ticksy-navy/10 text-ticksy-navy flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="ticksy-card text-center py-12">
          <p className="font-heading text-lg font-bold text-ticksy-navy/50">Batch not found</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="batch-details-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          data-testid="batch-back-btn"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full bg-white border border-ticksy-navy/10 text-ticksy-navy flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4]">{batch.title}</h1>
          <p className="font-body text-sm text-ticksy-navy/50">
            {DAYS[batch.day_of_week]} {formatTime(batch.start_time)}
            {batch.end_time ? ` - ${formatTime(batch.end_time)}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-ticksy-navy">Students</h2>
          <p className="font-body text-sm text-ticksy-navy/50">{students.length} enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openEditBatch}
            className="shrink-0 rounded-full border border-ticksy-blue px-4 py-2 text-sm font-body font-semibold text-ticksy-blue hover:bg-blue-50 transition-colors"
          >
            Edit Batch
          </button>
          <button
            data-testid="batch-add-student-btn"
            onClick={openAddStudent}
            className="ticksy-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Student
          </button>
        </div>
      </div>

      {notice && (
        <p className="text-sm font-body text-amber-600">{notice}</p>
      )}

      {error && !addOpen && (
        <p className="text-sm font-body text-red-500">{error}</p>
      )}

      {students.length === 0 ? (
        <div className="ticksy-card text-center py-12">
          <p className="font-heading text-lg font-bold text-ticksy-navy/50">No students yet</p>
          <p className="font-body text-sm text-ticksy-navy/40 mt-1">Add students to this batch to start tracking attendance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="ticksy-card flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-pink-200 text-pink-800 flex items-center justify-center font-heading font-bold text-sm shrink-0">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-bold text-ticksy-navy truncate">
                    {student.name}
                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-body font-bold text-blue-700">
                      {getModeBadgeLabel(student)}
                    </span>
                  </p>
                  <p className="font-body text-xs text-ticksy-navy/50 mt-1 truncate">
                    {[
                      student.medical_history ? `Medical: ${student.medical_history}` : null,
                      getAgeFromBirthday(student.birthday) != null ? `Age: ${getAgeFromBirthday(student.birthday)}` : null,
                    ].filter(Boolean).join(' | ') || 'No extra details added'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openEditStudent(student)}
                className="shrink-0 rounded-full border border-ticksy-blue px-4 py-2 text-sm font-body font-semibold text-ticksy-blue hover:bg-blue-50 transition-colors"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleDeleteBatch}
        className="w-full py-3 text-sm font-body font-semibold text-red-500"
      >
        Delete Batch
      </button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[24px] border-2 border-ticksy-navy bg-white p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ticksy-navy">
              {editingStudent ? 'Edit Student' : 'Add Student'}
            </DialogTitle>
            <DialogDescription className="font-body text-ticksy-navy/60">
              {editingStudent ? `Update ${editingStudent.name}'s details.` : `Add a student to ${batch.title}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStudent} className="mt-2 space-y-4 pb-2">
            {!editingStudent && unassignedStudents.length > 0 && (
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Existing Student</label>
                <select
                  value={existingStudentId}
                  onChange={(e) => handleSelectExisting(e.target.value)}
                  className="ticksy-input mt-1"
                >
                  <option value="">Create new instead</option>
                  {unassignedStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(!existingStudentId || editingStudent) && (
              <>
                <div>
                  <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Name</label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    required
                    className="ticksy-input mt-1"
                    placeholder="Student name"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Medical History</label>
                  <textarea
                    value={newStudentMedicalHistory}
                    onChange={(e) => setNewStudentMedicalHistory(e.target.value)}
                    className="ticksy-input mt-1 min-h-[96px] resize-none rounded-[24px] py-3"
                    placeholder="Optional notes, allergies, injuries, or any medical details"
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
                    <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Birthday</label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="ticksy-input mt-1"
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
              </>
            )}

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
                    <p className="font-body font-semibold text-ticksy-navy">Daily</p>
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

            <button type="submit" disabled={saving} className="ticksy-btn-primary w-full">
              {saving ? 'Saving...' : 'Save'}
            </button>

            {editingStudent && (
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={saving}
                className="w-full py-2 text-sm font-body font-semibold text-red-500"
              >
                Delete Student
              </button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editBatchOpen} onOpenChange={setEditBatchOpen}>
        <DialogContent className="rounded-[24px] border-2 border-ticksy-navy bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ticksy-navy">Edit Batch</DialogTitle>
            <DialogDescription className="font-body text-ticksy-navy/60">
              Update the batch name and timing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBatch} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Title</label>
              <input
                type="text"
                value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)}
                required
                className="ticksy-input mt-1"
                placeholder="Batch title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Start</label>
                <input
                  type="time"
                  value={batchStartTime}
                  onChange={(e) => setBatchStartTime(e.target.value)}
                  required
                  className="ticksy-input mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">End</label>
                <input
                  type="time"
                  value={batchEndTime}
                  onChange={(e) => setBatchEndTime(e.target.value)}
                  className="ticksy-input mt-1"
                />
              </div>
            </div>

            <button type="submit" disabled={savingBatch || !batchTitle.trim() || !batchStartTime} className="ticksy-btn-primary w-full">
              {savingBatch ? 'Saving...' : 'Save Batch'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
