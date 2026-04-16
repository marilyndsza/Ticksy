import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, UserPlus, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function Slots() {
  const { user } = useAuth()
  const [slots, setSlots] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // Create slot dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('')
  const [saving, setSaving] = useState(false)

  // Assign students dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [assignedStudentIds, setAssignedStudentIds] = useState([])

  useEffect(() => {
    if (user) {
      fetchSlots()
      fetchStudents()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlots = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('slots')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
    setSlots(data || [])
    setLoading(false)
  }

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name', { ascending: true })
    setStudents(data || [])
  }

  const handleCreateSlot = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('slots').insert({
      title,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime || null,
      user_id: user.id,
    })
    setSaving(false)
    setCreateOpen(false)
    setTitle('')
    setDayOfWeek(1)
    setStartTime('18:00')
    setEndTime('')
    fetchSlots()
  }

  const handleDeleteSlot = async (id) => {
    if (!window.confirm('Delete this slot? This also removes student assignments and attendance records.')) return
    await supabase.from('slots').delete().eq('id', id)
    fetchSlots()
  }

  const openAssign = async (slot) => {
    setSelectedSlot(slot)
    const { data } = await supabase
      .from('student_slots')
      .select('student_id')
      .eq('slot_id', slot.id)
    setAssignedStudentIds((data || []).map((d) => d.student_id))
    setAssignOpen(true)
  }

  const toggleStudentAssignment = async (studentId) => {
    if (assignedStudentIds.includes(studentId)) {
      await supabase
        .from('student_slots')
        .delete()
        .eq('slot_id', selectedSlot.id)
        .eq('student_id', studentId)
      setAssignedStudentIds((prev) => prev.filter((id) => id !== studentId))
    } else {
      await supabase.from('student_slots').insert({
        student_id: studentId,
        slot_id: selectedSlot.id,
        user_id: user.id,
      })
      setAssignedStudentIds((prev) => [...prev, studentId])
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  // Group slots by day
  const slotsByDay = DAYS.reduce((acc, day, i) => {
    const daySlots = slots.filter((s) => s.day_of_week === i)
    if (daySlots.length > 0) acc.push({ day, dayIndex: i, slots: daySlots })
    return acc
  }, [])

  return (
    <div data-testid="slots-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4]">Slots</h1>
        <button
          data-testid="add-slot-btn"
          onClick={() => setCreateOpen(true)}
          className="ticksy-btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Slot
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="ticksy-card animate-pulse h-20" />
          ))}
        </div>
      ) : slotsByDay.length === 0 ? (
        <div className="ticksy-card text-center py-12">
          <p className="font-heading text-lg font-bold text-ticksy-navy/50">No slots yet</p>
          <p className="font-body text-ticksy-navy/40 text-sm mt-1">Create your first slot to organize classes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {slotsByDay.map(({ day, slots: daySlots }) => (
            <div key={day}>
              <h2 className="font-heading text-lg font-bold text-ticksy-navy/70 mb-3">{day}</h2>
              <div className="space-y-3">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    data-testid={`slot-item-${slot.id}`}
                    className="ticksy-card flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-heading font-bold text-ticksy-navy">{slot.title}</h3>
                      <p className="font-body text-sm text-ticksy-navy/60">
                        {formatTime(slot.start_time)}
                        {slot.end_time && ` – ${formatTime(slot.end_time)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`assign-students-${slot.id}`}
                        onClick={() => openAssign(slot)}
                        className="p-2 rounded-full text-ticksy-blue hover:bg-ticksy-blue/10 transition-colors"
                        title="Assign Students"
                      >
                        <UserPlus size={18} />
                      </button>
                      <button
                        data-testid={`delete-slot-${slot.id}`}
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-2 rounded-full text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Slot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[24px] border-2 border-ticksy-navy bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ticksy-navy">New Slot</DialogTitle>
            <DialogDescription className="font-body text-ticksy-navy/60">
              Create a recurring class slot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSlot} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Title</label>
              <input
                data-testid="slot-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="ticksy-input mt-1"
                placeholder="e.g. Mon 6PM Batch"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Day of Week</label>
              <select
                data-testid="slot-day-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                className="ticksy-input mt-1"
              >
                {DAYS.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Start Time</label>
                <input
                  data-testid="slot-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="ticksy-input mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">End Time</label>
                <input
                  data-testid="slot-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="ticksy-input mt-1"
                />
              </div>
            </div>
            <button
              data-testid="slot-save-btn"
              type="submit"
              disabled={saving}
              className="ticksy-btn-primary w-full"
            >
              {saving ? 'Creating...' : 'Create Slot'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Students Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="rounded-[24px] border-2 border-ticksy-navy bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ticksy-navy">
              Assign Students
            </DialogTitle>
            <DialogDescription className="font-body text-ticksy-navy/60">
              {selectedSlot?.title} — Tap to assign/remove students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto">
            {students.length === 0 ? (
              <p className="font-body text-ticksy-navy/50 text-center py-6">
                No active students. Add students first.
              </p>
            ) : (
              students.map((student) => {
                const isAssigned = assignedStudentIds.includes(student.id)
                return (
                  <button
                    key={student.id}
                    data-testid={`assign-toggle-${student.id}`}
                    onClick={() => toggleStudentAssignment(student.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                      isAssigned
                        ? 'border-green-400 bg-green-50'
                        : 'border-ticksy-navy/10 bg-white hover:bg-ticksy-pink-light'
                    }`}
                  >
                    <span className="font-body font-semibold text-ticksy-navy">{student.name}</span>
                    {isAssigned ? (
                      <span className="text-green-600 text-xs font-bold font-body flex items-center gap-1">
                        Assigned <X size={14} />
                      </span>
                    ) : (
                      <span className="text-ticksy-navy/40 text-xs font-body">Tap to assign</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
