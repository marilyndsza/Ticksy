import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { GripVertical, Pin, Plus, Trash2, X } from 'lucide-react'

const CARD_STYLES = [
  {
    bg: 'bg-[#FFDDA8]',
    border: 'border-[#F6C67D]',
    tape: 'bg-[#FFF4D5]',
  },
  {
    bg: 'bg-[#CFE1FF]',
    border: 'border-[#AAC4FF]',
    tape: 'bg-[#EFF5FF]',
  },
  {
    bg: 'bg-[#E7D7FF]',
    border: 'border-[#CDB5FF]',
    tape: 'bg-[#F5EEFF]',
  },
  {
    bg: 'bg-[#CBF1D4]',
    border: 'border-[#A6E2B7]',
    tape: 'bg-[#ECFFF1]',
  },
  {
    bg: 'bg-[#FFD4E7]',
    border: 'border-[#F7B4D3]',
    tape: 'bg-[#FFF0F7]',
  },
]

const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yr = String(d.getFullYear()).slice(2)
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}, ${yr}'`
}

const resequenceNotes = (orderedNotes) =>
  orderedNotes.map((note, index) => ({
    ...note,
    board_order: index,
  }))

const moveItem = (items, fromIndex, toIndex) => {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

const getStableCardStyle = (note) => {
  const key = String(note.id || note.created_at || note.title || note.content || '')
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return CARD_STYLES[Math.abs(hash) % CARD_STYLES.length]
}

function NoteCard({ note, index, onDelete, onTogglePin, onDragStart, onDragOver, onDrop }) {
  const style = getStableCardStyle(note)

  return (
    <div
      data-testid={`note-card-${note.id}`}
      draggable
      onDragStart={() => onDragStart(note.id)}
      onDragOver={(event) => onDragOver(event, note.id)}
      onDrop={() => onDrop(note.id)}
      className={`perf-card group relative min-h-[132px] rounded-[22px] border p-4 shadow-[0_8px_18px_rgba(15,27,76,0.06)] transition-transform duration-200 hover:-translate-y-0.5 ${style.bg} ${style.border} ${note.is_pinned ? 'ring-2 ring-white/70' : ''}`}
    >
      <div className={`pointer-events-none absolute left-1/2 top-0 h-4 w-16 -translate-x-1/2 -translate-y-1 rounded-b-2xl shadow-sm ${style.tape}`} />
      <div className="pointer-events-none absolute right-0 top-0 h-10 w-10 translate-x-4 -translate-y-4 rotate-45 rounded-[10px] bg-white/35" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-ticksy-navy/45">
          <GripVertical size={16} className="cursor-grab active:cursor-grabbing" />
          {note.is_pinned && (
            <span className="rounded-full bg-white/75 px-2 py-1 text-[11px] font-body font-semibold uppercase tracking-[0.14em] text-ticksy-navy/70">
              Pinned
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            className={`rounded-full p-2 transition-colors ${note.is_pinned ? 'bg-white/75 text-ticksy-blue' : 'bg-white/50 text-ticksy-navy/55 hover:bg-white/70'}`}
            aria-label={note.is_pinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin size={14} className={note.is_pinned ? 'fill-current' : ''} />
          </button>
          <button
            data-testid={`delete-note-${note.id}`}
            onClick={() => onDelete(note.id)}
            className="rounded-full bg-white/50 p-2 text-ticksy-navy/55 transition-colors hover:bg-white/75"
            aria-label="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {note.title && (
        <p className="mb-2 font-heading text-lg font-bold text-ticksy-navy">{note.title}</p>
      )}
      <p className="font-body text-base font-medium leading-relaxed text-ticksy-navy/88">
        {note.content}
      </p>
      <p className="mt-4 font-body text-xs font-semibold tracking-[0.12em] text-ticksy-navy/45 uppercase">
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
  const [draggedNoteId, setDraggedNoteId] = useState(null)

  useEffect(() => {
    if (user) fetchNotes()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const orderedNotes = useMemo(() => (
    [...notes].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const orderA = a.board_order ?? 9999
      const orderB = b.board_order ?? 9999
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  ), [notes])

  const persistNoteBoard = async (nextNotes) => {
    setNotes(nextNotes)
    const payload = nextNotes.map((note, index) => ({
      id: note.id,
      user_id: note.user_id,
      is_pinned: Boolean(note.is_pinned),
      board_order: index,
    }))

    await supabase.from('notes').upsert(payload, { onConflict: 'id' })
  }

  const fetchNotes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('kind', 'note')
      .order('is_pinned', { ascending: false })
      .order('board_order', { ascending: true })
      .order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setSaving(true)

    const nextOrder = orderedNotes.filter((note) => !note.is_pinned).length
    const { data } = await supabase
      .from('notes')
      .insert({
        title: newTitle.trim() || null,
        content: newContent.trim(),
        kind: 'note',
        checklist_items: [],
        user_id: user.id,
        is_pinned: false,
        board_order: nextOrder,
      })
      .select('*')
      .single()

    setNewContent('')
    setNewTitle('')
    setShowAdd(false)
    setSaving(false)

    if (data) {
      setNotes((prev) => [...prev, data])
    } else {
      fetchNotes()
    }
  }

  const handleDelete = async (id) => {
    const nextNotes = resequenceNotes(orderedNotes.filter((note) => note.id !== id))
    setNotes(nextNotes)
    await supabase.from('notes').delete().eq('id', id)
    await supabase.from('notes').upsert(
      nextNotes.map((note) => ({
        id: note.id,
        user_id: note.user_id,
        is_pinned: Boolean(note.is_pinned),
        board_order: note.board_order,
      })),
      { onConflict: 'id' }
    )
  }

  const handleTogglePin = async (id) => {
    const target = orderedNotes.find((note) => note.id === id)
    if (!target) return

    const others = orderedNotes.filter((note) => note.id !== id)
    const pinned = others.filter((note) => note.is_pinned)
    const unpinned = others.filter((note) => !note.is_pinned)
    const moved = { ...target, is_pinned: !target.is_pinned }

    const nextNotes = resequenceNotes(
      moved.is_pinned
        ? [moved, ...pinned, ...unpinned]
        : [...pinned, moved, ...unpinned]
    )

    await persistNoteBoard(nextNotes)
  }

  const handleDragStart = (id) => {
    setDraggedNoteId(id)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDrop = async (targetId) => {
    if (!draggedNoteId || draggedNoteId === targetId) {
      setDraggedNoteId(null)
      return
    }

    const dragged = orderedNotes.find((note) => note.id === draggedNoteId)
    const target = orderedNotes.find((note) => note.id === targetId)
    if (!dragged || !target || dragged.is_pinned !== target.is_pinned) {
      setDraggedNoteId(null)
      return
    }

    const fromIndex = orderedNotes.findIndex((note) => note.id === draggedNoteId)
    const toIndex = orderedNotes.findIndex((note) => note.id === targetId)
    const nextNotes = resequenceNotes(moveItem(orderedNotes, fromIndex, toIndex))

    setDraggedNoteId(null)
    await persistNoteBoard(nextNotes)
  }

  return (
    <div data-testid="notes-page">
      <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#0D3CA4] mb-6 px-1">
        What&apos;s up ?
      </h1>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`min-h-[156px] rounded-[24px] animate-pulse ${CARD_STYLES[i % CARD_STYLES.length].bg}`}
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
                Drag notes around to reshuffle them, and pin the important ones so they stay on top.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Class Plan',
                body: 'Pin your next flow, sequence, or training idea so you can shape the session before class starts.',
              },
              {
                title: 'Medical Reminder',
                body: 'Keep short notes about allergies, injuries, or support your students may need.',
              },
              {
                title: 'Class Idea',
                body: 'Jot down drills, choreography ideas, or anything you want to try in the next batch.',
              },
            ].map((sample, index) => {
              const style = CARD_STYLES[index % CARD_STYLES.length]
              return (
                <div
                  key={sample.title}
                  className={`relative min-h-[132px] rounded-[22px] border p-4 shadow-[0_12px_28px_rgba(15,27,76,0.08)] ${style.bg} ${style.border}`}
                >
                  <div className={`pointer-events-none absolute left-1/2 top-0 h-4 w-16 -translate-x-1/2 -translate-y-1 rounded-b-2xl shadow-sm ${style.tape}`} />
                  <p className="font-heading text-lg font-bold text-ticksy-navy">{sample.title}</p>
                  <p className="font-body text-sm text-ticksy-navy/70 mt-2 leading-relaxed">
                    {sample.body}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="px-1 font-body text-sm font-medium text-ticksy-navy/55">
            Drag notes to reshuffle them. Pin a note to keep it at the top of the board.
          </p>
        <div className="perf-section grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orderedNotes.map((note, i) => (
              <NoteCard
                key={note.id}
                note={note}
                index={i}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      )}

      <button
        data-testid="add-note-fab"
        onClick={() => setShowAdd(true)}
        className="fixed z-40 w-14 h-14 rounded-full bg-ticksy-blue text-white flex items-center justify-center shadow-[0_10px_22px_rgba(43,79,200,0.22)] hover:scale-105 active:scale-95 transition-transform"
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
