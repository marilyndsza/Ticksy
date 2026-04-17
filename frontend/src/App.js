import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { UIProvider } from './contexts/UIContext'
import { Toaster } from './components/ui/sonner'
import Layout from './components/Layout'
import './App.css'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
const Notes = lazy(() => import('./pages/Notes'))
const MarkAttendance = lazy(() => import('./pages/MarkAttendance'))
const Slots = lazy(() => import('./pages/Slots'))
const Attendance = lazy(() => import('./pages/Attendance'))
const StudentCalendar = lazy(() => import('./pages/StudentCalendar'))
const Profile = lazy(() => import('./pages/Profile'))
const BatchDetails = lazy(() => import('./pages/BatchDetails'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-ticksy-pink flex items-center justify-center">
      <div className="font-heading text-2xl text-ticksy-navy animate-pulse">Loading...</div>
    </div>
  )
}

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
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
          <Toaster />
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
