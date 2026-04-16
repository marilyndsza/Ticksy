import { createClient } from '@supabase/supabase-js'
import { WEEKLY_DAYS, normalizeSelectedDays } from './studentSchedule'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

const hasConfiguredSupabase =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes('example.supabase.co') &&
  supabaseAnonKey !== 'demo'

const LOCAL_DB_KEY = 'ticksy.local.db.v1'
const LOCAL_SESSION_KEY = 'ticksy.local.session.v1'
const DEMO_EMAIL = 'demo@ticksy.app'
const DEMO_PASSWORD = 'Demo1234!'
const DEMO_USER_ID = 'demo-user'

const formatDate = (value) => new Date(value).toISOString().split('T')[0]
const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

const createSeedData = () => {
  const now = new Date()
  const today = formatDate(now)
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(now.getDate() - 3)

  return {
    users: [
      {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        user_metadata: {
          full_name: 'Teacher',
          name: 'Teacher',
        },
        created_at: now.toISOString(),
      },
    ],
    students: [
      {
        id: 'student-ava',
        user_id: DEMO_USER_ID,
        name: 'Ava Patel',
        medical_history: 'Mild dust allergy.',
        mode: 'weekly',
        selected_days: WEEKLY_DAYS,
        is_active: true,
        created_at: firstOfMonth.toISOString(),
      },
      {
        id: 'student-ryan',
        user_id: DEMO_USER_ID,
        name: 'Ryan Mehta',
        medical_history: 'Old ankle injury. Avoid overexertion.',
        mode: 'custom',
        selected_days: [now.getDay()],
        is_active: true,
        created_at: firstOfMonth.toISOString(),
      },
      {
        id: 'student-mia',
        user_id: DEMO_USER_ID,
        name: 'Mia Kapoor',
        mode: 'weekly',
        selected_days: WEEKLY_DAYS,
        is_active: true,
        created_at: firstOfMonth.toISOString(),
      },
    ],
    slots: [
      {
        id: 'slot-thu-evening',
        user_id: DEMO_USER_ID,
        title: 'Thu 6PM Batch',
        day_of_week: now.getDay(),
        start_time: '18:00',
        end_time: '19:00',
        created_at: firstOfMonth.toISOString(),
      },
      {
        id: 'slot-sat-morning',
        user_id: DEMO_USER_ID,
        title: 'Sat 10AM Batch',
        day_of_week: 6,
        start_time: '10:00',
        end_time: '11:00',
        created_at: firstOfMonth.toISOString(),
      },
    ],
    student_slots: [
      {
        id: 'student-slot-1',
        user_id: DEMO_USER_ID,
        student_id: 'student-ava',
        slot_id: 'slot-thu-evening',
      },
      {
        id: 'student-slot-2',
        user_id: DEMO_USER_ID,
        student_id: 'student-ryan',
        slot_id: 'slot-thu-evening',
      },
      {
        id: 'student-slot-3',
        user_id: DEMO_USER_ID,
        student_id: 'student-mia',
        slot_id: 'slot-sat-morning',
      },
    ],
    attendance: [
      {
        id: 'attendance-1',
        user_id: DEMO_USER_ID,
        student_id: 'student-ava',
        slot_id: 'slot-thu-evening',
        attendance_date: today,
        status: 'present',
      },
      {
        id: 'attendance-2',
        user_id: DEMO_USER_ID,
        student_id: 'student-ryan',
        slot_id: 'slot-thu-evening',
        attendance_date: today,
        status: 'absent',
      },
    ],
    batch_holidays: [],
    notes: [
      {
        id: 'note-1',
        user_id: DEMO_USER_ID,
        content: 'Call Ava’s parent about next week’s schedule.',
        kind: 'note',
        checklist_items: [],
        keep_forever: false,
        workout_date: null,
        created_at: threeDaysAgo.toISOString(),
      },
      {
        id: 'note-2',
        user_id: DEMO_USER_ID,
        content: 'Prepare custom-day worksheet for Ryan.',
        kind: 'note',
        checklist_items: [],
        keep_forever: false,
        workout_date: null,
        created_at: now.toISOString(),
      },
    ],
  }
}

const migrateLocalDb = (db) => ({
  ...db,
  students: (db.students || []).map((student) => {
    let mode = student.mode
    if (mode === 'alternate') mode = 'custom'
    if (mode !== 'custom') mode = 'weekly'

    const selectedDays = normalizeSelectedDays(
      student.selected_days || student.alternate_days || (mode === 'weekly' ? WEEKLY_DAYS : [])
    )

    return {
      ...student,
      mode,
      selected_days: selectedDays,
    }
  }),
  notes: (db.notes || []).map((note) => ({
    ...note,
    kind: note.kind || 'note',
    checklist_items: Array.isArray(note.checklist_items) ? note.checklist_items : [],
    keep_forever: note.keep_forever ?? false,
    workout_date: note.workout_date || null,
  })),
})

const readLocalDb = () => {
  const raw = window.localStorage.getItem(LOCAL_DB_KEY)
  if (raw) {
    const migrated = migrateLocalDb(JSON.parse(raw))
    window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(migrated))
    return migrated
  }

  const seed = createSeedData()
  window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(seed))
  return seed
}

const writeLocalDb = (db) => {
  window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db))
  return db
}

const readLocalSession = () => {
  const raw = window.localStorage.getItem(LOCAL_SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

const writeLocalSession = (session) => {
  if (session) window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session))
  else window.localStorage.removeItem(LOCAL_SESSION_KEY)
}

const clone = (value) => JSON.parse(JSON.stringify(value))

const authListeners = new Set()

const emitAuthChange = (event, session) => {
  authListeners.forEach((listener) => listener(event, session))
}

const buildLocalSessionUser = (user) => ({
  id: user.id,
  email: user.email,
  user_metadata: user.user_metadata || {},
})

class LocalQueryBuilder {
  constructor(table) {
    this.table = table
    this.filters = []
    this.orders = []
    this.selectClause = '*'
    this.selectOptions = {}
    this.singleResult = false
    this.action = 'select'
    this.payload = null
    this.upsertOptions = {}
  }

  select(columns = '*', options = {}) {
    this.selectClause = columns
    this.selectOptions = options
    return this
  }

  eq(column, value) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  in(column, values) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  gte(column, value) {
    this.filters.push((row) => row[column] >= value)
    return this
  }

  lte(column, value) {
    this.filters.push((row) => row[column] <= value)
    return this
  }

  order(column, { ascending = true } = {}) {
    this.orders.push({ column, ascending })
    return this
  }

  single() {
    this.singleResult = true
    return this
  }

  insert(values) {
    this.action = 'insert'
    this.payload = Array.isArray(values) ? values : [values]
    return this
  }

  update(values) {
    this.action = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  upsert(values, options = {}) {
    this.action = 'upsert'
    this.payload = Array.isArray(values) ? values : [values]
    this.upsertOptions = options
    return this
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject)
  }

  async execute() {
    const db = readLocalDb()
    switch (this.action) {
      case 'insert':
        return this.executeInsert(db)
      case 'update':
        return this.executeUpdate(db)
      case 'delete':
        return this.executeDelete(db)
      case 'upsert':
        return this.executeUpsert(db)
      default:
        return this.executeSelect(db)
    }
  }

  getRows(db) {
    return clone(db[this.table] || [])
  }

  applyFilters(rows) {
    return rows.filter((row) => this.filters.every((filter) => filter(row)))
  }

  applyOrders(rows) {
    return rows.sort((a, b) => {
      for (const { column, ascending } of this.orders) {
        if (a[column] < b[column]) return ascending ? -1 : 1
        if (a[column] > b[column]) return ascending ? 1 : -1
      }
      return 0
    })
  }

  withRelations(rows, db) {
    if (this.table === 'student_slots' && this.selectClause.includes('students(')) {
      return rows.map((row) => ({
        ...row,
        students: clone((db.students || []).find((student) => student.id === row.student_id) || null),
      }))
    }
    return rows
  }

  shapeRows(rows, db) {
    return this.withRelations(rows, db)
  }

  executeSelect(db) {
    let rows = this.applyFilters(this.getRows(db))
    rows = this.applyOrders(rows)
    rows = this.shapeRows(rows, db)

    if (this.singleResult) {
      return Promise.resolve({
        data: rows[0] || null,
        error: rows[0] ? null : { message: 'No rows found' },
      })
    }

    if (this.selectOptions.head) {
      return Promise.resolve({
        data: null,
        error: null,
        count: rows.length,
      })
    }

    return Promise.resolve({
      data: rows,
      error: null,
      count: this.selectOptions.count ? rows.length : null,
    })
  }

  executeInsert(db) {
    const inserted = this.payload.map((row) => ({
      id: row.id || makeId(this.table.slice(0, -1) || this.table),
      created_at: row.created_at || new Date().toISOString(),
      is_active: row.is_active ?? true,
      ...row,
    }))

    db[this.table] = [...(db[this.table] || []), ...inserted]
    writeLocalDb(db)

    let data = inserted
    if (this.singleResult) data = inserted[0] || null

    return Promise.resolve({ data, error: null })
  }

  executeUpdate(db) {
    const rows = db[this.table] || []
    const updated = []

    db[this.table] = rows.map((row) => {
      if (!this.filters.every((filter) => filter(row))) return row
      const next = { ...row, ...this.payload }
      updated.push(next)
      return next
    })

    writeLocalDb(db)

    let data = updated
    if (this.singleResult) data = updated[0] || null
    return Promise.resolve({ data, error: null })
  }

  executeDelete(db) {
    const rows = db[this.table] || []
    const removed = rows.filter((row) => this.filters.every((filter) => filter(row)))
    db[this.table] = rows.filter((row) => !this.filters.every((filter) => filter(row)))

    if (this.table === 'students') {
      const removedIds = removed.map((row) => row.id)
      db.student_slots = (db.student_slots || []).filter((row) => !removedIds.includes(row.student_id))
      db.attendance = (db.attendance || []).filter((row) => !removedIds.includes(row.student_id))
    }

    if (this.table === 'slots') {
      const removedIds = removed.map((row) => row.id)
      db.student_slots = (db.student_slots || []).filter((row) => !removedIds.includes(row.slot_id))
      db.attendance = (db.attendance || []).filter((row) => !removedIds.includes(row.slot_id))
    }

    writeLocalDb(db)
    return Promise.resolve({ data: removed, error: null })
  }

  executeUpsert(db) {
    const rows = db[this.table] || []
    const conflictColumns = (this.upsertOptions.onConflict || '')
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean)

    const upserted = this.payload.map((incoming) => {
      const existingIndex = rows.findIndex((row) =>
        conflictColumns.every((column) => row[column] === incoming[column])
      )

      if (existingIndex >= 0) {
        const next = { ...rows[existingIndex], ...incoming }
        rows[existingIndex] = next
        return next
      }

      const next = {
        id: incoming.id || makeId(this.table.slice(0, -1) || this.table),
        created_at: incoming.created_at || new Date().toISOString(),
        is_active: incoming.is_active ?? true,
        ...incoming,
      }
      rows.push(next)
      return next
    })

    db[this.table] = rows
    writeLocalDb(db)

    return Promise.resolve({
      data: this.singleResult ? upserted[0] || null : upserted,
      error: null,
    })
  }
}

const createLocalSupabaseClient = () => ({
  auth: {
    async getSession() {
      return { data: { session: readLocalSession() }, error: null }
    },
    onAuthStateChange(callback) {
      authListeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      }
    },
    async signUp({ email, password }) {
      const db = readLocalDb()
      const normalizedEmail = email.trim().toLowerCase()
      const exists = (db.users || []).some((user) => user.email === normalizedEmail)

      if (exists) {
        return { data: null, error: { message: 'User already exists' } }
      }

      const user = {
        id: makeId('user'),
        email: normalizedEmail,
        password,
        user_metadata: {},
        created_at: new Date().toISOString(),
      }
      db.users.push(user)
      writeLocalDb(db)

      const session = { access_token: 'local-token', user: buildLocalSessionUser(user) }
      writeLocalSession(session)
      emitAuthChange('SIGNED_IN', session)

      return { data: { user: session.user, session }, error: null }
    },
    async signInWithPassword({ email, password }) {
      const db = readLocalDb()
      const normalizedEmail = email.trim().toLowerCase()
      const user = (db.users || []).find((item) => item.email === normalizedEmail)

      if (!user || user.password !== password) {
        return { data: null, error: { message: 'Invalid login credentials' } }
      }

      const session = { access_token: 'local-token', user: buildLocalSessionUser(user) }
      writeLocalSession(session)
      emitAuthChange('SIGNED_IN', session)

      return { data: { user: session.user, session }, error: null }
    },
    async updateUser({ data }) {
      const session = readLocalSession()
      if (!session?.user?.id) {
        return { data: null, error: { message: 'No active session' } }
      }

      const db = readLocalDb()
      const userIndex = (db.users || []).findIndex((item) => item.id === session.user.id)
      if (userIndex < 0) {
        return { data: null, error: { message: 'User not found' } }
      }

      const nextUser = {
        ...db.users[userIndex],
        user_metadata: {
          ...(db.users[userIndex].user_metadata || {}),
          ...(data || {}),
        },
      }
      db.users[userIndex] = nextUser
      writeLocalDb(db)

      const nextSession = {
        ...session,
        user: buildLocalSessionUser(nextUser),
      }
      writeLocalSession(nextSession)
      emitAuthChange('USER_UPDATED', nextSession)

      return { data: { user: nextSession.user }, error: null }
    },
    async signOut() {
      writeLocalSession(null)
      emitAuthChange('SIGNED_OUT', null)
      return { error: null }
    },
  },
  from(table) {
    return new LocalQueryBuilder(table)
  },
})

export const isUsingLocalSupabase = !hasConfiguredSupabase

export const supabase = hasConfiguredSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : createLocalSupabaseClient()
