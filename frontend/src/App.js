import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { UIProvider } from './contexts/UIContext'
import { Toaster } from './components/ui/sonner'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Notes from './pages/Notes'
import MarkAttendance from './pages/MarkAttendance'
import Slots from './pages/Slots'
import Attendance from './pages/Attendance'
import StudentCalendar from './pages/StudentCalendar'
import Profile from './pages/Profile'
import BatchDetails from './pages/BatchDetails'
import Layout from './components/Layout'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-ticksy-pink flex items-center justify-center">
        <div className="font-heading text-2xl text-ticksy-navy animate-pulse">Loading...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-ticksy-pink flex items-center justify-center">
        <div className="font-heading text-2xl text-ticksy-navy animate-pulse">Loading...</div>
      </div>
    )
  }
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/students" element={<Students />} />
            <Route path="/mark" element={<MarkAttendance />} />
            <Route path="/slots" element={<Slots />} />
            <Route path="/attendance/:slotId" element={<Attendance />} />
            <Route path="/batches/:slotId" element={<BatchDetails />} />
            <Route path="/calendar" element={<StudentCalendar />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
