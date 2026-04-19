import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import { supabase } from '../lib/supabase'
import { attendsOnDay } from '../lib/studentSchedule'
import { Check, ChevronRight, ClipboardCheck, X } from 'lucide-react'

export default function MarkAttendance() {
  const { user } = useAuth()
  const { setNavbarHidden } = useUI()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  // Bottom sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [students, setStudents] = useState([])
  const [presentIds, setPresentIds] = useState(new Set())
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  const todayDate = new Date().toISOString().split('T')[0]
  useEffect(() => {
    if (user) fetchBatches()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBatches = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('slots')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
    setBatches(data || [])
    setLoading(false)
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  const openBatch = useCallback(async (batch) => {
    setSelectedBatch(batch)
    setLoadingStudents(true)
    setSheetOpen(true)
    setNavbarHidden(true)

    // Fetch assigned students
    const { data: studentSlots } = await supabase
      .from('student_slots')
      .select('student_id, students(id, name, is_active)')
      .eq('slot_id', batch.id)

    const studentList = (studentSlots || [])
      .map((ss) => ss.students)
      .filter((s) => s && s.is_active)
      .filter((s) => attendsOnDay(s, batch.day_of_week))
      .sort((a, b) => a.name.localeCompare(b.name))
    setStudents(studentList)

    // Fetch existing attendance for today
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('slot_id', batch.id)
      .eq('attendance_date', todayDate)

    const present = new Set()
    ;(attendanceData || []).forEach((a) => {
      if (a.status === 'present') present.add(a.student_id)
    })
    setPresentIds(present)
    setLoadingStudents(false)
  }, [todayDate, setNavbarHidden])

  const toggleStudent = (studentId) => {
    setPresentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const handleDone = async () => {
    if (!selectedBatch) return
    setSaving(true)

    const upserts = students.map((s) => ({
      student_id: s.id,
      slot_id: selectedBatch.id,
      attendance_date: todayDate,
      status: presentIds.has(s.id) ? 'present' : 'absent',
      user_id: user.id,
    }))

    if (upserts.length > 0) {
      await supabase
        .from('attendance')
        .upsert(upserts, { onConflict: 'student_id,slot_id,attendance_date' })
    }

    setSaving(false)
    setSheetOpen(false)
    setSelectedBatch(null)
    setNavbarHidden(false)
  }

  return (
    <div data-testid="mark-attendance-page">
      <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4] mb-6 px-1">
        Mark Attendance
      </h1>
      <p className="mb-5 px-1 font-body text-sm font-medium text-ticksy-navy/55">
        Choose a batch below to open its attendance checklist for today.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-2xl animate-pulse h-16" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-heading text-lg font-bold text-ticksy-navy/40">No batches yet</p>
          <p className="font-body text-sm text-ticksy-navy/30 mt-1">
            Create batches from your Profile to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            (() => {
              const isSelected = selectedBatch?.id === batch.id
              return (
                <button
                  key={batch.id}
                  data-testid={`batch-card-${batch.id}`}
                  onClick={() => openBatch(batch)}
                  className={`relative overflow-hidden w-full text-left rounded-[26px] p-4 transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-2 border-[#4B6EE8] bg-gradient-to-br from-[#EAF2FF] via-white to-[#DDEBFF] shadow-[0_10px_30px_rgba(75,110,232,0.16)]'
                      : 'border-2 border-white/80 bg-white/95 shadow-[0_8px_24px_rgba(15,27,76,0.08)] hover:border-[#D5E3FF] hover:shadow-[0_10px_28px_rgba(15,27,76,0.10)]'
                  }`}
                >
              {isSelected && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.12) 38%, rgba(120,170,255,0.18) 100%)',
                  }}
                />
              )}
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      isSelected ? 'bg-[#D8E7FF] text-ticksy-blue' : 'bg-[#EEF5FF] text-ticksy-blue'
                    }`}>
                      <ClipboardCheck size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-ticksy-navy">{batch.title}</p>
                      <p className={`font-body text-sm ${
                        isSelected ? 'text-ticksy-navy/55' : 'text-ticksy-navy/60'
                      }`}>
                        {formatTime(batch.start_time)}
                        {batch.end_time && ` – ${formatTime(batch.end_time)}`}
                      </p>
                      <p className="mt-1 font-body text-xs font-semibold uppercase tracking-[0.18em] text-ticksy-blue/65">
                        Tap to open checklist
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isSelected ? 'bg-white/80 text-ticksy-blue' : 'bg-[#F5F8FF] text-ticksy-blue/80'
                }`}>
                  <ChevronRight size={18} />
                </div>
              </div>
                </button>
              )
            })()
          ))}
        </div>
      )}

      {/* Bottom Sheet */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => { setSheetOpen(false); setSelectedBatch(null); setNavbarHidden(false) }}
        >
          <div className="absolute inset-0 bg-black/40 transition-opacity" />
          <div
            className="relative w-full bg-white rounded-t-3xl flex flex-col"
            style={{ height: '85vh', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-100">
              <h2 className="font-heading text-2xl font-bold text-ticksy-navy">
                Who's present today?
              </h2>
              <p className="font-body text-sm text-ticksy-navy/50 mt-1">
                {selectedBatch?.title}
              </p>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-24">
              {loadingStudents ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-blue-200 rounded-full animate-pulse h-14" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <p className="font-body text-center text-ticksy-navy/40 py-8">
                  No students assigned to this batch.
                </p>
              ) : (
                students.map((student) => {
                  const isPresent = presentIds.has(student.id)
                  return (
                    <button
                      key={student.id}
                      data-testid={`attendance-toggle-${student.id}`}
                      onClick={() => toggleStudent(student.id)}
                      className={`w-full flex items-center gap-3 rounded-full px-5 py-4 transition-all duration-200 ease-in-out active:scale-[1.02] ${
                        isPresent
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-blue-800 text-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                          isPresent
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-white/50 bg-transparent'
                        }`}
                      >
                        {isPresent && <Check size={16} className="text-white" />}
                      </div>
                      <span className="font-body font-semibold text-base">{student.name}</span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Done Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
              <button
                data-testid="attendance-done-btn"
                onClick={handleDone}
                disabled={saving}
                className="w-full bg-blue-700 text-white py-4 rounded-full font-heading font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
