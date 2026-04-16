import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

const Sparkle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
  </svg>
)

export default function Landing() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard')
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-ticksy-pink flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Full-page decorative grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#0F1B4C 1px, transparent 1px), linear-gradient(90deg, #0F1B4C 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Decorative sparkles */}
      <Sparkle className="absolute top-16 right-12 w-8 h-8 text-ticksy-hotpink animate-pulse" />
      <Sparkle className="absolute top-24 right-24 w-5 h-5 text-ticksy-hotpink animate-pulse delay-200" />
      <Sparkle className="absolute bottom-32 left-12 w-6 h-6 text-ticksy-hotpink animate-pulse delay-500" />
      <Sparkle className="absolute top-40 left-16 w-4 h-4 text-ticksy-hotpink animate-pulse delay-700" />

      <div className="text-center max-w-md w-full z-10">
        <h1
          data-testid="landing-title"
          className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-[#0D3CA4] mb-4 tracking-tight"
        >
          Ticksy
        </h1>
        <p
          data-testid="landing-subtitle"
          className="font-body text-ticksy-navy/70 text-lg mb-12"
        >
          A smarter way of tracking your attendance.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          <button
            data-testid="landing-signup-btn"
            onClick={() => navigate('/signup')}
            className="w-full rounded-full bg-ticksy-blue text-white font-heading font-bold text-lg py-4 px-8 shadow-[0_4px_0_0_#1E3DA0] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
          >
            Sign Up
          </button>
          <button
            data-testid="landing-login-btn"
            onClick={() => navigate('/login')}
            className="w-full rounded-full bg-white text-ticksy-navy font-heading font-bold text-lg py-4 px-8 border-2 border-ticksy-navy shadow-[0_4px_0_0_#0F1B4C] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
          >
            Log In
          </button>
        </div>
      </div>

    </div>
  )
}
