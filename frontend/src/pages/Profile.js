import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DAYS } from '../lib/studentSchedule'
import { LogOut, Mail, PencilLine, Plus, Users } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog'

export default function Profile() {
  const { user, signOut, getLoginId, getDisplayName, updateProfileName } = useAuth()
  const navigate = useNavigate()

  const [batches, setBatches] = useState([])
  const [batchCounts, setBatchCounts] = useState({})
  const [loadingBatches, setLoadingBatches] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')

  useEffect(() => {
    setProfileName(
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      getLoginId(user) ||
      'Trainer'
    )
  }, [user, getLoginId])

  useEffect(() => {
    if (user) fetchBatches()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBatches = async () => {
    setLoadingBatches(true)
    const { data } = await supabase.from('slots').select('*')
      .eq('user_id', user.id)
      .order('day_of_week')
      .order('start_time')

    setBatches(data || [])

    const counts = {}
    for (const batch of data || []) {
      const { data: studentSlots } = await supabase
        .from('student_slots')
        .select('student_id')
        .eq('slot_id', batch.id)
      counts[batch.id] = (studentSlots || []).length
    }
    setBatchCounts(counts)
    setLoadingBatches(false)
  }

  const handleCreateBatch = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('slots').insert({
      title,
      day_of_week: new Date().getDay(),
      start_time: startTime,
      end_time: endTime || null,
      user_id: user.id,
    })
    setSaving(false)
    setCreateOpen(false)
    setTitle('')
    setStartTime('18:00')
    setEndTime('')
    fetchBatches()
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) return
    setSavingProfile(true)
    setProfileNotice('')
    try {
      await updateProfileName(profileName)
      setProfileNotice('Trainer name updated.')
    } catch (error) {
      setProfileNotice(error.message || 'Could not update trainer name right now.')
    } finally {
      setSavingProfile(false)
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = Number(h)
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div data-testid="profile-page" className="space-y-8">
      <div className="ticksy-card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-ticksy-blue flex items-center justify-center">
          <span className="text-white font-heading font-bold text-xl">
            {getDisplayName(user)?.charAt(0).toUpperCase() || 'T'}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-heading font-bold text-ticksy-navy text-lg">{getDisplayName(user)}</p>
          <p className="font-body text-sm flex items-center gap-1 text-ticksy-navy/50">
            <Mail size={14} /> {user?.email || ''}
          </p>
          <p className="font-body text-sm text-ticksy-navy/50 mt-1">
            Login ID: <span className="font-semibold text-ticksy-navy">{getLoginId(user) || 'Not set'}</span>
          </p>
          <form onSubmit={handleSaveProfile} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <PencilLine size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ticksy-navy/35" />
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Trainer name"
                className="w-full rounded-full border border-ticksy-navy/10 bg-white px-10 py-2.5 text-sm font-body text-ticksy-navy outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile || !profileName.trim()}
              className="rounded-full bg-ticksy-blue px-4 py-2.5 text-sm font-body font-semibold text-white disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Save Name'}
            </button>
          </form>
          {profileNotice && (
            <p className={`font-body text-xs mt-2 ${profileNotice.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>
              {profileNotice}
            </p>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-ticksy-navy">Batches</h2>
          <button
            data-testid="add-batch-btn"
            onClick={() => setCreateOpen(true)}
            className="ticksy-btn-primary flex items-center gap-2 !py-2 !px-4 text-sm"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {loadingBatches ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="ticksy-card animate-pulse h-20" />)}
          </div>
        ) : batches.length === 0 ? (
          <div className="ticksy-card text-center py-10">
            <p className="font-heading text-lg font-bold text-ticksy-navy/50">No batches yet</p>
            <p className="font-body text-sm text-ticksy-navy/40 mt-1">Create your first batch to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <button
                key={batch.id}
                data-testid={`batch-card-${batch.id}`}
                onClick={() => navigate(`/batches/${batch.id}`)}
                className="ticksy-card w-full text-left transition-colors hover:bg-white"
              >
                <p className="font-heading font-bold text-ticksy-navy">{batch.title}</p>
                <p className="font-body text-sm text-ticksy-navy/50 mt-1">
                  {DAYS[batch.day_of_week]} {formatTime(batch.start_time)}
                  {batch.end_time ? ` - ${formatTime(batch.end_time)}` : ''}
                </p>
                <p className="font-body text-sm text-ticksy-navy/60 mt-2">
                  {batchCounts[batch.id] || 0} students
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold text-ticksy-navy">Students</h2>
        <button
          data-testid="manage-students-btn"
          onClick={() => navigate('/students')}
          className="w-full ticksy-card flex items-center gap-3 !p-4 text-left hover:bg-white transition-colors"
        >
          <Users size={20} className="text-ticksy-blue" />
          <span className="font-heading font-bold text-ticksy-navy text-sm">Manage Students</span>
        </button>
      </section>

      <button
        data-testid="profile-logout-btn"
        onClick={handleLogout}
        className="w-full ticksy-card flex items-center justify-center gap-3 !p-4 hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} className="text-red-500" />
        <span className="font-heading font-bold text-red-500">Log Out</span>
      </button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[24px] border-2 border-ticksy-navy bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ticksy-navy">New Batch</DialogTitle>
            <DialogDescription className="font-body text-ticksy-navy/60">
              Create a recurring class batch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBatch} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Title</label>
              <input
                data-testid="batch-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="ticksy-input mt-1"
                placeholder="e.g. Wed 6PM Batch"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">Start</label>
                <input
                  data-testid="batch-start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="ticksy-input mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ticksy-navy ml-2 font-body">End</label>
                <input
                  data-testid="batch-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="ticksy-input mt-1"
                />
              </div>
            </div>

            <button
              data-testid="batch-save-btn"
              type="submit"
              disabled={saving}
              className="ticksy-btn-primary w-full"
            >
              {saving ? 'Creating...' : 'Create Batch'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
