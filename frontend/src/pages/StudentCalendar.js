import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Calendar } from '../components/ui/calendar'
import { DAYS_SHORT, getModeBadgeLabel, getStudentSelectedDays, formatSelectedDays, getModeLabel } from '../lib/studentSchedule'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CalendarDays, ChevronDown, Download, UserRound } from 'lucide-react'

const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTrainerName = (user) => {
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name
  if (metadataName) return metadataName
  if (user?.email) return user.email.split('@')[0]
  return 'Trainer'
}

export default function StudentCalendar() {
  const { user } = useAuth()
  const [batches, setBatches] = useState([])
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [batchStudents, setBatchStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [attendanceData, setAttendanceData] = useState([])
  const [month, setMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [batchDrop, setBatchDrop] = useState(false)
  const [studentDrop, setStudentDrop] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [savingDay, setSavingDay] = useState(false)
  const [dayError, setDayError] = useState('')
  const [holidays, setHolidays] = useState([])
  const [holidaysAvailable, setHolidaysAvailable] = useState(true)
  const [makeupSessions, setMakeupSessions] = useState([])
  const [makeupSessionsAvailable, setMakeupSessionsAvailable] = useState(true)

  // Monthly summary for all students in batch
  const [allBatchAttendance, setAllBatchAttendance] = useState([])

  useEffect(() => { if (user) fetchBatches() }, [user]) // eslint-disable-line
  useEffect(() => { if (selectedBatchId) fetchBatchStudents() }, [selectedBatchId]) // eslint-disable-line
  useEffect(() => { if (selectedStudentId && selectedBatchId) fetchAttendance() }, [selectedStudentId, selectedBatchId, month]) // eslint-disable-line
  useEffect(() => { if (selectedBatchId && batchStudents.length > 0) fetchAllBatchAttendance() }, [selectedBatchId, batchStudents, month]) // eslint-disable-line
  useEffect(() => { if (selectedBatchId) fetchHolidays() }, [selectedBatchId, month]) // eslint-disable-line
  useEffect(() => { if (selectedBatchId) fetchMakeupSessions() }, [selectedBatchId, month]) // eslint-disable-line

  const fetchBatches = async () => {
    const { data } = await supabase.from('slots').select('*')
      .eq('user_id', user.id).order('day_of_week').order('start_time')
    setBatches(data || [])
    if (data?.length > 0) setSelectedBatchId(data[0].id)
    setLoading(false)
  }

  const fetchBatchStudents = async () => {
    const { data } = await supabase.from('student_slots')
      .select('student_id, students(*)')
      .eq('slot_id', selectedBatchId)
    const list = (data || [])
      .map(s => s.students)
      .filter(s => s?.is_active)
      .sort((a, b) => a.name.localeCompare(b.name))
    setBatchStudents(list)
    setSelectedDate(null)
    if (list.length > 0 && (!selectedStudentId || !list.find(s => s.id === selectedStudentId))) {
      setSelectedStudentId(list[0].id)
    }
  }

  const fetchAttendance = async () => {
    const { start, end } = getMonthRange()
    const { data } = await supabase.from('attendance')
      .select('attendance_date, status')
      .eq('student_id', selectedStudentId).eq('slot_id', selectedBatchId)
      .gte('attendance_date', start).lte('attendance_date', end)
    setAttendanceData(data || [])
  }

  const fetchAllBatchAttendance = async () => {
    const { start, end } = getMonthRange()
    const ids = batchStudents.map(s => s.id)
    if (ids.length === 0) { setAllBatchAttendance([]); return }
    const { data } = await supabase.from('attendance')
      .select('student_id, attendance_date, status')
      .eq('slot_id', selectedBatchId)
      .in('student_id', ids)
      .gte('attendance_date', start).lte('attendance_date', end)
    setAllBatchAttendance(data || [])
  }

  const fetchHolidays = async () => {
    const { start, end } = getMonthRange()

    try {
      const { data, error } = await supabase
        .from('batch_holidays')
        .select('holiday_date')
        .eq('slot_id', selectedBatchId)
        .gte('holiday_date', start)
        .lte('holiday_date', end)

      if (error) throw error
      setHolidaysAvailable(true)
      setHolidays((data || []).map((entry) => entry.holiday_date))
    } catch (error) {
      console.error('Failed to load batch holidays', error)
      if ((error.message || '').includes('public.batch_holidays')) {
        setHolidaysAvailable(false)
      }
      setHolidays([])
    }
  }

  const fetchMakeupSessions = async () => {
    const { start, end } = getMonthRange()

    try {
      const { data, error } = await supabase
        .from('batch_makeup_sessions')
        .select('session_date')
        .eq('slot_id', selectedBatchId)
        .gte('session_date', start)
        .lte('session_date', end)

      if (error) throw error
      setMakeupSessionsAvailable(true)
      setMakeupSessions((data || []).map((entry) => entry.session_date))
    } catch (error) {
      console.error('Failed to load batch makeup sessions', error)
      if ((error.message || '').includes('public.batch_makeup_sessions')) {
        setMakeupSessionsAvailable(false)
      }
      setMakeupSessions([])
    }
  }

  const getMonthRange = () => {
    const y = month.getFullYear(), m = month.getMonth()
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lastDay = new Date(y, m + 1, 0).getDate()
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { start, end }
  }

  const selectedBatch = batches.find(b => b.id === selectedBatchId)
  const selectedStudent = batchStudents.find(s => s.id === selectedStudentId)
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long' })
  const fullMonthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const holidaySet = useMemo(() => new Set(holidays), [holidays])
  const makeupSessionSet = useMemo(() => new Set(makeupSessions), [makeupSessions])
  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : ''
  const selectedDateStatus = selectedDateKey
    ? attendanceData.find((entry) => entry.attendance_date === selectedDateKey)?.status || null
    : null
  const selectedDateIsHoliday = selectedDateKey ? holidaySet.has(selectedDateKey) : false
  const selectedDateIsMakeupSession = selectedDateKey ? makeupSessionSet.has(selectedDateKey) : false
  const selectedDateIsExpected = selectedDate && selectedStudent
    ? (getStudentSelectedDays(selectedStudent).includes(selectedDate.getDay()) && !selectedDateIsHoliday) || selectedDateIsMakeupSession
    : false

  // Build scheduled dates for the selected student
  const { presentDates, absentDates, scheduledDates } = useMemo(() => {
    const present = [], absent = [], scheduled = []
    if (!selectedBatch || !selectedStudent) return { presentDates: present, absentDates: absent, scheduledDates: scheduled }

    const selectedDays = getStudentSelectedDays(selectedStudent)
    const y = month.getFullYear(), m = month.getMonth()
    const lastDay = new Date(y, m + 1, 0).getDate()

    // Build attendance lookup
    const attendMap = {}
    attendanceData.forEach(a => { attendMap[a.attendance_date] = a.status })

    const datesInMonth = []
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(y, m, d)
      datesInMonth.push(d)
    }

    for (const d of datesInMonth) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dt = new Date(y, m, d)
      const status = attendMap[dateStr]
      const isHoliday = holidaySet.has(dateStr)
      const isExpected = (selectedDays.includes(dt.getDay()) && !isHoliday) || makeupSessionSet.has(dateStr)

      if (isHoliday && !makeupSessionSet.has(dateStr)) continue
      if (status === 'present') present.push(dt)
      else if (status === 'absent') absent.push(dt)
      else if (isExpected) scheduled.push(dt)
    }

    return { presentDates: present, absentDates: absent, scheduledDates: scheduled }
  }, [selectedBatch, selectedStudent, month, attendanceData, holidaySet, makeupSessionSet])

  // Monthly summary calculation
  const monthlySummary = useMemo(() => {
    if (!batchStudents.length) return []
    const y = month.getFullYear(), m = month.getMonth()
    const lastDay = new Date(y, m + 1, 0).getDate()

    return batchStudents.map(student => {
      const studentSelectedDays = getStudentSelectedDays(student)
      const studentAttendance = allBatchAttendance
        .filter(a => a.student_id === student.id)
        .filter(a => !holidaySet.has(a.attendance_date))
      const attendanceMap = {}
      studentAttendance.forEach((entry) => {
        attendanceMap[entry.attendance_date] = entry.status
      })
      const presentCount = studentAttendance.filter(a => a.status === 'present').length
      const absentCount = studentAttendance.filter(a => a.status === 'absent').length
      let adjustedTotal = 0
      const dailyStatuses = []
      for (let d = 1; d <= lastDay; d++) {
        const dt = new Date(y, m, d)
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const isHoliday = holidaySet.has(dateStr)
        const isExpected = (studentSelectedDays.includes(dt.getDay()) && !isHoliday) || makeupSessionSet.has(dateStr)
        if (isExpected) adjustedTotal += 1
        dailyStatuses.push({
          day: d,
          date: dateStr,
          status: isHoliday && !makeupSessionSet.has(dateStr)
            ? 'holiday'
            : (attendanceMap[dateStr] || (isExpected ? 'scheduled' : 'off')),
        })
      }
      const pct = adjustedTotal > 0 ? Math.round((presentCount / adjustedTotal) * 100) : 0
      const absentPct = adjustedTotal > 0 ? Math.round((absentCount / adjustedTotal) * 100) : 0
      return {
        ...student,
        presentCount,
        absentCount,
        totalExpected: adjustedTotal,
        scheduledCount: Math.max(adjustedTotal - presentCount - absentCount, 0),
        pct: Math.min(pct, 100),
        absentPct: Math.min(absentPct, 100),
        dailyStatuses,
      }
    })
  }, [batchStudents, allBatchAttendance, month, holidaySet, makeupSessionSet])

  const overviewStats = useMemo(() => {
    const totals = monthlySummary.reduce((acc, student) => ({
      students: acc.students + 1,
      totalPresent: acc.totalPresent + (student.presentCount || 0),
      totalAbsent: acc.totalAbsent + (student.absentCount || 0),
      totalSessions: acc.totalSessions + (student.totalExpected || 0),
    }), { students: 0, totalPresent: 0, totalAbsent: 0, totalSessions: 0 })

    return {
      ...totals,
      holidays: holidays.length,
    }
  }, [monthlySummary, holidays.length])

  const formatReportDays = (student) => {
    const days = getStudentSelectedDays(student)
    if (days.length === 0) return 'No scheduled days'
    const reportLabels = ['Sun', 'M', 'T', 'W', 'Th', 'F', 'Sat']
    return days.map((day) => reportLabels[day]).join(', ')
  }

  const formatJoinedDate = (student) => {
    if (!student.date_joined) return '—'
    const [year, month, day] = String(student.date_joined).split('-')
    if (!year || !month || !day) return '—'
    return `${day}/${month}/${year}`
  }

  const formatReportDates = (entries, status) => {
    const matches = entries
      .filter((entry) => entry.status === status)
      .map((entry) => new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    return matches.length > 0 ? matches.join(', ') : 'None'
  }

  const formatPaymentMode = (student) => {
    if (student.payment_mode === 'online') return 'Online'
    if (student.payment_mode === 'cash') return 'Cash'
    return '—'
  }

  const formatFeeAmount = (student) => {
    if (student.fee_amount == null || student.fee_amount === '') return '—'
    const value = Number(student.fee_amount)
    if (Number.isNaN(value)) return '—'
    const formatted = value.toLocaleString('en-IN', { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })
    return `Rs. ${formatted}`
  }

  const downloadMonthlyAttendance = () => {
    if (!selectedBatch || monthlySummary.length === 0) return
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const trainerName = getTrainerName(user)

    doc.setFillColor(238, 245, 255)
    doc.rect(0, 0, pageWidth, 138, 'F')
    doc.setFillColor(13, 60, 164)
    doc.roundedRect(40, 34, 116, 28, 14, 14, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('TICKSY REPORT', 54, 52)

    doc.setFontSize(22)
    doc.setTextColor(15, 27, 76)
    doc.text(selectedBatch.title, 40, 92)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(71, 85, 105)
    doc.text(`Overview for ${fullMonthLabel}`, 40, 108)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(13, 60, 164)
    doc.text('TRAINER', pageWidth - 160, 96)
    doc.setDrawColor(13, 60, 164)
    doc.setLineWidth(1)
    doc.line(pageWidth - 160, 101, pageWidth - 108, 101)
    doc.setFontSize(18)
    doc.text(trainerName, pageWidth - 160, 122)

    const statY = 152
    const statWidth = (pageWidth - 80 - 36) / 4
    const statGap = 12
    const stats = [
      ['Students', String(overviewStats.students)],
      ['Total Present', String(overviewStats.totalPresent)],
      ['Total Absent', String(overviewStats.totalAbsent)],
      ['Total Sessions', String(overviewStats.totalSessions)],
    ]

    stats.forEach(([label, value], index) => {
      const x = 40 + index * (statWidth + statGap)
      const fills = [
        [243, 229, 255],
        [230, 255, 239],
        [255, 237, 240],
        [232, 241, 255],
      ]
      doc.setDrawColor(210, 224, 248)
      doc.setFillColor(...fills[index])
      doc.roundedRect(x, statY, statWidth, 58, 12, 12, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(13, 60, 164)
      doc.text(value, x + 12, statY + 24)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139)
      doc.text(label, x + 12, statY + 42)
    })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(15, 27, 76)
    doc.text('Student Summary', 28, 238)

    autoTable(doc, {
      startY: 246,
      head: [[
        'Student',
        'Joined',
        'Mode',
        'Scheduled Days',
        'Present',
        'Absent',
        'Expected',
        'Pay Mode',
        'Amount',
      ]],
      body: monthlySummary.map((student) => [
        student.name,
        formatJoinedDate(student),
        getModeLabel(student),
        formatReportDays(student),
        String(student.presentCount),
        String(student.absentCount),
        String(student.totalExpected),
        formatPaymentMode(student),
        formatFeeAmount(student),
      ]),
      margin: { left: 28, right: 24 },
      headStyles: {
        fillColor: [13, 60, 164],
        textColor: [255, 255, 255],
        lineColor: [13, 60, 164],
        lineWidth: 1,
        fontSize: 7.5,
        fontStyle: 'bold',
        valign: 'middle',
      },
      bodyStyles: {
        textColor: [15, 27, 76],
        fontSize: 8.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.6,
      },
      alternateRowStyles: {
        fillColor: [247, 250, 255],
      },
      styles: {
        cellPadding: 5,
        valign: 'top',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 54 },
        2: { cellWidth: 42 },
        3: { cellWidth: 104 },
        4: { cellWidth: 40 },
        5: { cellWidth: 40 },
        6: { cellWidth: 46 },
        7: { cellWidth: 58 },
        8: { cellWidth: 56 },
      },
    })

    doc.save(`${selectedBatch.title}-${fullMonthLabel.replace(/\s+/g, '-')}-attendance-report.pdf`)
  }

  const presentCount = presentDates.length
  const absentCount = absentDates.length
  const scheduledCount = scheduledDates.length

  const markSpecificDay = async (status) => {
    if (!selectedDate || !selectedStudent || !selectedBatch || !user) return

    setSavingDay(true)
    setDayError('')

    try {
      if (!status) {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('student_id', selectedStudent.id)
          .eq('slot_id', selectedBatch.id)
          .eq('attendance_date', selectedDateKey)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('attendance')
          .upsert({
            student_id: selectedStudent.id,
            slot_id: selectedBatch.id,
            attendance_date: selectedDateKey,
            status,
            user_id: user.id,
          }, { onConflict: 'student_id,slot_id,attendance_date' })

        if (error) throw error
      }

      await fetchAttendance()
      await fetchAllBatchAttendance()
      await fetchHolidays()
      await fetchMakeupSessions()
    } catch (error) {
      console.error('Failed to mark specific attendance date', error)
      setDayError(error.message || 'Could not update attendance for that day.')
    } finally {
      setSavingDay(false)
    }
  }

  const toggleHoliday = async () => {
    if (!selectedDate || !selectedBatch || !user) return

    setSavingDay(true)
    setDayError('')

    try {
      if (!holidaysAvailable) {
        setDayError('Holiday marking is unavailable until the batch_holidays table is added in Supabase.')
        return
      }

      if (selectedDateIsHoliday) {
        const { error } = await supabase
          .from('batch_holidays')
          .delete()
          .eq('slot_id', selectedBatch.id)
          .eq('holiday_date', selectedDateKey)

        if (error) throw error
      } else {
        const { error: holidayError } = await supabase
          .from('batch_holidays')
          .upsert({
            slot_id: selectedBatch.id,
            holiday_date: selectedDateKey,
            user_id: user.id,
          }, { onConflict: 'slot_id,holiday_date' })

        if (holidayError) throw holidayError

        const { error: clearAttendanceError } = await supabase
          .from('attendance')
          .delete()
          .eq('slot_id', selectedBatch.id)
          .eq('attendance_date', selectedDateKey)

        if (clearAttendanceError) throw clearAttendanceError
      }

      await fetchAttendance()
      await fetchAllBatchAttendance()
      await fetchHolidays()
      await fetchMakeupSessions()
    } catch (error) {
      console.error('Failed to update holiday', error)
      setDayError(error.message || 'Could not update holiday for that day.')
    } finally {
      setSavingDay(false)
    }
  }

  const toggleMakeupSession = async () => {
    if (!selectedDate || !selectedBatch || !user) return

    setSavingDay(true)
    setDayError('')

    try {
      if (!makeupSessionsAvailable) {
        setDayError('Rescheduling is unavailable until the batch_makeup_sessions table is added in Supabase.')
        return
      }

      if (selectedDateIsMakeupSession) {
        const { error } = await supabase
          .from('batch_makeup_sessions')
          .delete()
          .eq('slot_id', selectedBatch.id)
          .eq('session_date', selectedDateKey)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('batch_makeup_sessions')
          .upsert({
            slot_id: selectedBatch.id,
            session_date: selectedDateKey,
            user_id: user.id,
          }, { onConflict: 'slot_id,session_date' })

        if (error) throw error
      }

      await fetchAttendance()
      await fetchAllBatchAttendance()
      await fetchHolidays()
      await fetchMakeupSessions()
    } catch (error) {
      console.error('Failed to update rescheduled session', error)
      setDayError(error.message || 'Could not update scheduled class for that day.')
    } finally {
      setSavingDay(false)
    }
  }

  return (
    <div data-testid="calendar-page" className="space-y-5">
      <div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4]">Calendar</h1>
        <p className="font-heading text-lg font-semibold tracking-wide text-ticksy-navy/70 mt-2">
          Here's your overview for the month of <span className="text-[#0D3CA4]">{monthLabel}</span>.
        </p>
        {selectedBatch && (
          <div className="mt-3 inline-flex items-center rounded-full bg-[#2443C5] px-4 py-2 text-sm font-body font-semibold text-white shadow-[0_8px_20px_rgba(36,67,197,0.18)]">
            Currently showing data for:
            <span className="ml-2 font-heading text-base font-black tracking-[0.01em] text-white">
              {selectedBatch.title}
            </span>
          </div>
        )}
      </div>

      {selectedBatch && monthlySummary.length > 0 && (
        <div className="ticksy-card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-heading text-xl font-bold text-ticksy-navy">Monthly Overview</p>
            </div>
            <button
              type="button"
              onClick={downloadMonthlyAttendance}
              className="inline-flex items-center gap-2 rounded-full bg-ticksy-blue px-4 py-2 text-sm font-body font-semibold text-white"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-ticksy-pink px-4 py-3">
              <p className="font-heading text-2xl font-bold text-ticksy-navy">{overviewStats.students}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Students</p>
            </div>
            <div className="rounded-2xl bg-green-50 px-4 py-3">
              <p className="font-heading text-2xl font-bold text-green-600">{overviewStats.totalPresent}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Total Present</p>
            </div>
            <div className="rounded-2xl bg-red-50 px-4 py-3">
              <p className="font-heading text-2xl font-bold text-red-500">{overviewStats.totalAbsent}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Total Absent</p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="font-heading text-2xl font-bold text-blue-600">{overviewStats.totalSessions}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Total Sessions</p>
            </div>
          </div>

          {overviewStats.holidays > 0 && (
            <p className="font-body text-xs text-amber-700">
              {overviewStats.holidays} holiday{overviewStats.holidays === 1 ? '' : 's'} excluded from this month&apos;s expected session count.
            </p>
          )}
        </div>
      )}

      {monthlySummary.length > 0 && (
        <div className="ticksy-card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(15,27,76,0.08)' }}>
            <h3 className="font-heading text-xl font-bold text-ticksy-navy">Monthly Summary</h3>
          </div>
          <div className="grid grid-cols-[56px_minmax(0,1.8fr)_minmax(92px,1fr)_88px_88px] gap-3 border-b bg-[#F7FAFF] px-5 py-3 text-[11px] font-body font-semibold uppercase tracking-[0.12em] text-ticksy-navy/45" style={{ borderColor: 'rgba(15,27,76,0.08)' }}>
            <span>No.</span>
            <span>Student</span>
            <span>Total Sessions</span>
            <span>Present</span>
            <span>Absent</span>
          </div>
          <div
            className="max-h-[360px] overflow-y-auto divide-y"
            style={{ borderColor: 'rgba(15,27,76,0.06)' }}
          >
            {monthlySummary.map((s, index) => (
              <div
                key={s.id}
                className="grid grid-cols-[56px_minmax(0,1.8fr)_minmax(92px,1fr)_88px_88px] gap-3 px-5 py-4 items-center"
              >
                <span className="font-body text-sm font-semibold tabular-nums text-ticksy-navy/75">{index + 1}.</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-body font-semibold text-sm text-ticksy-navy">{s.name}</span>
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                      {getModeBadgeLabel(s)}
                    </span>
                  </div>
                </div>
                <span className="font-body text-sm font-semibold tabular-nums text-ticksy-navy/75">{s.totalExpected}</span>
                <span className="font-body text-sm font-semibold tabular-nums text-green-600">{s.presentCount}</span>
                <span className="font-body text-sm font-semibold tabular-nums text-red-500">{s.absentCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ticksy-card space-y-5 overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,249,255,0.94)_100%)]">
        <div className="space-y-3 rounded-[28px] border border-ticksy-blue/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,255,0.92)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="relative">
          <button data-testid="batch-selector" onClick={() => { setBatchDrop(!batchDrop); setStudentDrop(false) }}
            className="w-full flex items-center justify-between rounded-2xl border border-[#2A47B8] bg-[#2443C5] px-4 py-4 cursor-pointer shadow-[0_10px_22px_rgba(36,67,197,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ticksy-blue shadow-[0_6px_14px_rgba(255,255,255,0.18)]">
                <CalendarDays size={18} />
              </div>
              <div className="leading-tight">
                <p className="font-body text-xs text-white/65 m-0">Batch</p>
                <p className="font-heading font-bold text-white">{selectedBatch?.title || 'Select batch'}</p>
              </div>
            </div>
            <ChevronDown size={20} className={`text-white/75 transition-transform ${batchDrop ? 'rotate-180' : ''}`} />
          </button>
          {batchDrop && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-ticksy-navy rounded-2xl overflow-hidden z-20 shadow-lg">
              {batches.map(b => (
                <button key={b.id} onClick={() => { setSelectedBatchId(b.id); setBatchDrop(false); setSelectedDate(null) }}
                  className={`w-full text-left px-4 py-3 font-body font-semibold text-ticksy-navy hover:bg-ticksy-pink-light ${b.id === selectedBatchId ? 'bg-ticksy-pink' : ''}`}>
                  {b.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {batchStudents.length > 0 && (
          <div className="relative">
            <button data-testid="student-selector" onClick={() => { setStudentDrop(!studentDrop); setBatchDrop(false) }}
              className="w-full flex items-center justify-between rounded-2xl border border-[#2A47B8] bg-[#2443C5] px-4 py-4 cursor-pointer shadow-[0_10px_22px_rgba(36,67,197,0.18)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-pink-500 shadow-[0_6px_14px_rgba(255,255,255,0.18)]">
                  <UserRound size={18} />
                </div>
                <div className="leading-tight">
                  <p className="font-body text-xs text-white/65 m-0">Student</p>
                  <p className="font-heading font-bold text-white">
                    {selectedStudent?.name || 'Select student'}
                  {selectedStudent?.mode && (
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-body text-ticksy-blue">
                      {getModeBadgeLabel(selectedStudent)}
                    </span>
                  )}
                </p>
                {(selectedStudent?.mode === 'custom' || selectedStudent?.mode === 'alternate') && (
                  <p className="font-body text-xs text-[#DDE7FF] mt-1">
                    Custom: {formatSelectedDays(selectedStudent)}
                  </p>
                )}
                </div>
              </div>
              <ChevronDown size={20} className={`text-white/75 transition-transform ${studentDrop ? 'rotate-180' : ''}`} />
            </button>
            {studentDrop && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-ticksy-navy rounded-2xl overflow-hidden z-20 shadow-lg">
                {batchStudents.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStudentId(s.id); setStudentDrop(false); setSelectedDate(null) }}
                    className={`w-full text-left px-4 py-3 font-body font-semibold text-ticksy-navy hover:bg-ticksy-pink-light flex items-center justify-between ${s.id === selectedStudentId ? 'bg-ticksy-pink' : ''}`}>
                    <span>{s.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {getModeBadgeLabel(s)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

      {loading ? (
        <div className="animate-pulse h-80 rounded-[28px] border border-ticksy-blue/10 bg-white/80" />
      ) : !selectedBatchId ? (
        <div className="rounded-[28px] border border-ticksy-blue/10 bg-white/80 py-12 text-center">
          <p className="font-heading text-lg font-bold text-ticksy-navy/50">No batches yet</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-[22px] border border-ticksy-blue/20 bg-white/92 px-3 py-3 text-center shadow-[0_6px_18px_rgba(15,27,76,0.04)]">
              <p className="font-heading text-xl font-bold text-green-600">{presentCount}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Present</p>
            </div>
            <div className="flex-1 rounded-[22px] border border-ticksy-blue/20 bg-white/92 px-3 py-3 text-center shadow-[0_6px_18px_rgba(15,27,76,0.04)]">
              <p className="font-heading text-xl font-bold text-red-500">{absentCount}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Absent</p>
            </div>
            <div className="flex-1 rounded-[22px] border border-ticksy-blue/20 bg-white/92 px-3 py-3 text-center shadow-[0_6px_18px_rgba(15,27,76,0.04)]">
              <p className="font-heading text-xl font-bold text-blue-500">{scheduledCount}</p>
              <p className="font-body text-xs text-ticksy-navy/60">Scheduled</p>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex justify-center rounded-[28px] border border-ticksy-blue/16 bg-white/96 p-4 shadow-[0_8px_24px_rgba(15,27,76,0.05)] sm:p-6">
            <Calendar
              mode="single"
              month={month}
              selected={selectedDate}
              onSelect={setSelectedDate}
              onMonthChange={setMonth}
              modifiers={{
                present: presentDates,
                absent: absentDates,
                scheduled: scheduledDates,
                holiday: holidays.map((date) => new Date(`${date}T00:00:00`)),
                makeup: makeupSessions.map((date) => new Date(`${date}T00:00:00`)),
              }}
              modifiersClassNames={{
                present: 'calendar-present',
                absent: 'calendar-absent',
                scheduled: 'calendar-scheduled',
                holiday: 'calendar-holiday',
                makeup: 'calendar-makeup',
              }}
              className="w-full max-w-[330px] p-1 font-body sm:max-w-[390px] sm:p-3"
              classNames={{
                month: 'w-full space-y-5',
                caption: 'flex justify-center pt-1 relative items-center px-12',
                caption_label: 'text-base font-semibold text-ticksy-navy',
                nav_button: 'h-9 w-9 rounded-lg border border-ticksy-blue/15 bg-white p-0 opacity-80 hover:opacity-100',
                nav_button_previous: 'absolute left-0',
                nav_button_next: 'absolute right-0',
                table: 'w-full border-collapse',
                head_row: 'flex w-full justify-between',
                head_cell: 'w-10 rounded-md text-center font-body text-sm font-semibold text-ticksy-navy/45',
                row: 'flex w-full justify-between mt-3',
                cell: 'relative p-0 text-center text-base focus-within:relative focus-within:z-20',
                day: 'h-10 w-10 rounded-full p-0 font-body text-base font-semibold text-[#4B5563] aria-selected:opacity-100 hover:bg-[#EAF3FF]',
                day_outside: 'day-outside !text-slate-300 aria-selected:bg-accent/50 aria-selected:!text-slate-300',
              }}
            />
          </div>

          {selectedStudent && selectedDate && (
            <div className="space-y-3 rounded-[24px] border border-ticksy-blue/16 bg-white/96 p-4 shadow-[0_8px_24px_rgba(15,27,76,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-bold text-ticksy-navy">Mark Specific Day</p>
                  <p className="font-body text-sm text-ticksy-navy/60">
                    {selectedStudent.name} · {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-body font-semibold ${
                  selectedDateIsHoliday
                    ? 'bg-amber-100 text-amber-700'
                    : selectedDateIsMakeupSession
                    ? 'bg-violet-100 text-violet-700'
                    : selectedDateStatus === 'present'
                    ? 'bg-green-100 text-green-700'
                    : selectedDateStatus === 'absent'
                    ? 'bg-red-100 text-red-600'
                    : selectedDateIsExpected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedDateIsHoliday
                    ? 'Holiday'
                    : selectedDateIsMakeupSession
                    ? 'Rescheduled'
                    : selectedDateStatus
                    ? selectedDateStatus[0].toUpperCase() + selectedDateStatus.slice(1)
                    : selectedDateIsExpected
                    ? 'Scheduled'
                    : 'No mark'}
                </span>
              </div>

              {selectedDateIsHoliday ? (
                <p className="font-body text-xs text-amber-700">
                  This date is marked as a batch holiday and is excluded from monthly expected sessions.
                </p>
              ) : selectedDateIsMakeupSession ? (
                <p className="font-body text-xs text-violet-700">
                  This date is marked as a rescheduled class and is added back into monthly expected sessions.
                </p>
              ) : !holidaysAvailable ? (
                <p className="font-body text-xs text-amber-700">
                  Holiday marking is currently unavailable in this Supabase project. Attendance marking still works normally.
                </p>
              ) : !selectedDateIsExpected && (
                <p className="font-body text-xs text-amber-700">
                  This day is outside the student&apos;s normal schedule, but you can still save a manual attendance mark if needed.
                </p>
              )}

              {dayError && (
                <p className="font-body text-sm text-red-500">{dayError}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleHoliday}
                  disabled={savingDay || !holidaysAvailable}
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-body font-semibold text-white disabled:opacity-50"
                >
                  {savingDay ? 'Saving...' : selectedDateIsHoliday ? 'Remove Holiday' : 'Mark Holiday'}
                </button>
                <button
                  type="button"
                  onClick={toggleMakeupSession}
                  disabled={savingDay || !makeupSessionsAvailable || selectedDateIsHoliday}
                  className="rounded-full bg-violet-500 px-4 py-2 text-sm font-body font-semibold text-white disabled:opacity-50"
                >
                  {savingDay ? 'Saving...' : selectedDateIsMakeupSession ? 'Remove Schedule' : 'Schedule Class'}
                </button>
                <button
                  type="button"
                  onClick={() => markSpecificDay('present')}
                  disabled={savingDay || selectedDateIsHoliday}
                  className="rounded-full bg-green-500 px-4 py-2 text-sm font-body font-semibold text-white disabled:opacity-50"
                >
                  {savingDay ? 'Saving...' : 'Mark Present'}
                </button>
                <button
                  type="button"
                  onClick={() => markSpecificDay('absent')}
                  disabled={savingDay || selectedDateIsHoliday}
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-body font-semibold text-white disabled:opacity-50"
                >
                  {savingDay ? 'Saving...' : 'Mark Absent'}
                </button>
                <button
                  type="button"
                  onClick={() => markSpecificDay(null)}
                  disabled={savingDay || !selectedDateStatus}
                  className="rounded-full border border-ticksy-navy/15 bg-white px-4 py-2 text-sm font-body font-semibold text-ticksy-navy disabled:opacity-50"
                >
                  Clear Mark
                </button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 flex-wrap border-t border-ticksy-blue/10 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-body text-xs text-ticksy-navy/70">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="font-body text-xs text-ticksy-navy/70">Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-300" />
              <span className="font-body text-xs text-ticksy-navy/70">Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-violet-400" />
              <span className="font-body text-xs text-ticksy-navy/70">Rescheduled</span>
            </div>
          </div>

        </>
      )}
      </div>
    </div>
  )
}
