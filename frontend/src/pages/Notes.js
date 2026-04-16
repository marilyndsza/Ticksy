import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, X } from 'lucide-react'

const CARD_COLORS = [
  'bg-orange-200',
  'bg-blue-200',
  'bg-purple-200',
  'bg-green-200',
  'bg-pink-200',
]

const pickColor = (index) => CARD_COLORS[index % CARD_COLORS.length]

function NoteCard({ note, index, onDelete }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const yr = String(d.getFullYear()).slice(2)
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}, ${yr}'`
  }

  return (
    <div
      data-testid={`note-card-${note.id}`}
      className={`${pickColor(index)} rounded-2xl p-4 relative group`}
    >
      <button
        data-testid={`delete-note-${note.id}`}
        onClick={() => onDelete(note.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white/60 hover:bg-white"
      >
        <Trash2 size={14} className="text-gray-600" />
      </button>
      {note.title && (
        <p className="text-sm font-bold text-gray-800 font-heading mb-1">{note.title}</p>
      )}
      <p className="text-sm font-medium text-gray-800 font-body leading-relaxed">
        {note.content}
      </p>
      <p className="text-xs text-gray-500/70 font-body mt-2">
        {formatDate(note.created_at)}
      </p>
    </div>
  )
}

export default function Notes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) fetchNotes()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNotes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('kind', 'note')
      .order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setSaving(true)
    await supabase.from('notes').insert({
      title: newTitle.trim() || null,
      content: newContent.trim(),
      kind: 'note',
      checklist_items: [],
      user_id: user.id,
    })
    setNewContent('')
    setNewTitle('')
    setShowAdd(false)
    setSaving(false)
    fetchNotes()
  }

  const handleDelete = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div data-testid="notes-page">
      <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4] mb-6 px-1">
        What&apos;s up ?
      </h1>

      {loading ? (
        <div className="columns-2 gap-3 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`break-inside-avoid ${CARD_COLORS[i % 5]} rounded-2xl animate-pulse`}
              style={{ height: i % 2 === 0 ? 80 : 120 }}
            />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="space-y-6">
          <div className="ticksy-card overflow-hidden !p-0">
            <div className="bg-gradient-to-r from-[#F3F8FF] via-white to-[#E8F1FF] px-6 py-6">
              <p className="font-heading text-xl font-bold text-ticksy-navy">Your quick note board</p>
              <p className="font-body text-sm text-ticksy-navy/60 mt-2 max-w-xl">
                Use this space to pin reminders, injuries to watch, class ideas, or anything you want to remember fast.
                Tap the `+` button to drop a quick sticky note onto the board.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Class Plan',
                body: 'Pin your next flow, sequence, or training idea so you can shape the session before class starts.',
                color: 'bg-[#FFE9A8]',
                angle: '-rotate-2',
              },
              {
                title: 'Medical Reminder',
                body: 'Keep short notes about allergies, injuries, or support your students may need.',
                color: 'bg-[#DDF1FF]',
                angle: 'rotate-1',
              },
              {
                title: 'Class Idea',
                body: 'Jot down drills, choreography ideas, or anything you want to try in the next batch.',
                color: 'bg-[#E6E0FF]',
                angle: '-rotate-1',
              },
            ].map((sample) => (
              <div
                key={sample.title}
                className={`${sample.color} ${sample.angle} rounded-[24px] border border-white/70 p-5 shadow-[0_10px_30px_rgba(15,27,76,0.08)]`}
              >
                <p className="font-heading text-base font-bold text-ticksy-navy">{sample.title}</p>
                <p className="font-body text-sm text-ticksy-navy/70 mt-2 leading-relaxed">
                  {sample.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="columns-2 gap-3 space-y-3">
          {notes.map((note, i) => (
            <div key={note.id} className="break-inside-avoid">
              <NoteCard note={note} index={i} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      <button
        data-testid="add-note-fab"
        onClick={() => setShowAdd(true)}
        className="fixed z-40 w-14 h-14 rounded-full bg-ticksy-blue text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
        style={{ bottom: 160, right: 20 }}
      >
        <Plus size={28} />
      </button>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white p-6 pb-8 shadow-[0_24px_80px_rgba(15,27,76,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-ticksy-navy">New Note</h2>
              <button
                data-testid="close-add-note"
                onClick={() => setShowAdd(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Optional title"
              className="w-full rounded-full border-2 bg-white px-4 py-3 text-ticksy-navy placeholder-slate-400 font-body text-sm"
              style={{ borderColor: 'rgba(15,27,76,0.15)' }}
            />
            <textarea
              data-testid="note-content-input"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write something..."
              rows={4}
              className="w-full rounded-2xl border-2 bg-white px-4 py-3 text-ticksy-navy placeholder-slate-400 font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ticksy-blue/30 mt-4"
              style={{ borderColor: 'rgba(15,27,76,0.15)' }}
              autoFocus
            />
            <button
              data-testid="save-note-btn"
              onClick={handleAdd}
              disabled={saving || !newContent.trim()}
              className="ticksy-btn-primary w-full mt-4"
            >
              {saving ? 'Saving...' : 'Pin to Board'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
