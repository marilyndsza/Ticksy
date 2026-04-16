import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { attendsOnDay } from '../lib/studentSchedule'
import { ArrowLeft } from 'lucide-react'

export default function Attendance() {
  const { slotId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [slot, setSlot] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)

  const todayDate = new Date().toISOString().split('T')[0]

  const fetchData = useCallback(async () => {
    if (!user || !slotId) return
    setLoading(true)

    // Fetch slot
    const { data: slotData } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slotId)
      .single()
    setSlot(slotData)

    // Fetch students assigned to this slot
    const { data: studentSlots } = await supabase
      .from('student_slots')
      .select('student_id, students(id, name, medical_history, is_active)')
      .eq('slot_id', slotId)

    const studentList = (studentSlots || [])
      .map((ss) => ss.students)
      .filter(Boolean)
      .filter((s) => s.is_active)
      .filter((s) => attendsOnDay(s, slotData?.day_of_week))
      .sort((a, b) => a.name.localeCompare(b.name))
    setStudents(studentList)

    // Fetch existing attendance for today
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('slot_id', slotId)
      .eq('attendance_date', todayDate)

    const attendanceMap = {}
    ;(attendanceData || []).forEach((a) => {
      attendanceMap[a.student_id] = a.status
    })
    setAttendance(attendanceMap)
    setLoading(false)
  }, [user, slotId, todayDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const presentCount = Object.values(attendance).filter((s) => s === 'present').length
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length

  return (
    <div data-testid="attendance-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          data-testid="attendance-back-btn"
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-full hover:bg-ticksy-navy/5 transition-colors"
        >
          <ArrowLeft size={24} className="text-ticksy-navy" />
        </button>
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4]">
            {slot?.title || 'Batch Details'}
          </h1>
          <p className="font-body text-sm text-ticksy-navy/60">
            {new Date(todayDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        <div className="flex-1 ticksy-card !p-4 text-center">
          <p className="font-heading text-2xl font-bold text-green-600">{presentCount}</p>
          <p className="font-body text-xs text-ticksy-navy/60">Present</p>
        </div>
        <div className="flex-1 ticksy-card !p-4 text-center">
          <p className="font-heading text-2xl font-bold text-red-500">{absentCount}</p>
          <p className="font-body text-xs text-ticksy-navy/60">Absent</p>
        </div>
        <div className="flex-1 ticksy-card !p-4 text-center">
          <p className="font-heading text-2xl font-bold text-ticksy-navy/40">
            {students.length - presentCount - absentCount}
          </p>
          <p className="font-body text-xs text-ticksy-navy/60">Unmarked</p>
        </div>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ticksy-card animate-pulse h-16" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="ticksy-card text-center py-12">
          <p className="font-heading text-lg font-bold text-ticksy-navy/50">
            No students assigned
          </p>
          <p className="font-body text-ticksy-navy/40 text-sm mt-1">
            Assign students to this slot from the Slots page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => {
            const status = attendance[student.id]
            return (
              <div
                key={student.id}
                data-testid={`attendance-row-${student.id}`}
                className={`ticksy-card transition-all ${
                  status === 'present'
                    ? '!border-green-400 !bg-green-50'
                    : status === 'absent'
                    ? '!border-red-300 !bg-red-50'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm shrink-0 ${
                        status === 'present'
                          ? 'bg-green-200 text-green-800'
                          : status === 'absent'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-ticksy-pink text-ticksy-navy'
                      }`}
                    >
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-ticksy-navy">{student.name}</p>
                      <p className="font-body text-xs font-semibold uppercase tracking-wide text-ticksy-navy/45 mt-2">
                        Medical History
                      </p>
                      <p className="font-body text-sm text-ticksy-navy/70 mt-1">
                        {student.medical_history?.trim() || 'No medical history added.'}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-body font-semibold ${
                    status === 'present'
                      ? 'bg-green-100 text-green-700'
                      : status === 'absent'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Unmarked'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
