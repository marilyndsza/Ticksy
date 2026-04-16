import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'

const Sparkle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
  </svg>
)

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await signUp(email, password)
      if (data.user && !data.session) {
        setSuccess(true)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-ticksy-pink flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#0F1B4C 1px, transparent 1px), linear-gradient(90deg, #0F1B4C 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-body font-semibold text-ticksy-navy shadow-[0_8px_20px_rgba(15,27,76,0.12)] backdrop-blur-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="w-full max-w-sm text-center relative z-10">
          <h1 className="font-heading text-4xl font-bold text-[#0D3CA4] mb-4">Check your email!</h1>
          <p className="font-body text-ticksy-navy/70 mb-8">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <button
            data-testid="signup-goto-login-btn"
            onClick={() => navigate('/login')}
            className="w-full rounded-full bg-ticksy-blue text-white font-heading font-bold text-lg py-4 px-8 shadow-[0_4px_0_0_#1E3DA0] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ticksy-pink flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#0F1B4C 1px, transparent 1px), linear-gradient(90deg, #0F1B4C 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <Sparkle className="absolute top-20 right-16 w-8 h-8 text-ticksy-hotpink animate-pulse" />
      <Sparkle className="absolute top-28 right-28 w-5 h-5 text-ticksy-hotpink animate-pulse delay-200" />

      <button
        type="button"
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-body font-semibold text-ticksy-navy shadow-[0_8px_20px_rgba(15,27,76,0.12)] backdrop-blur-sm"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="w-full max-w-sm z-10">
        <h1
          data-testid="signup-title"
          className="font-heading text-4xl font-bold text-[#0D3CA4] text-center mb-2"
        >
          Sign Up
        </h1>
        <p className="font-body text-ticksy-navy/70 text-center mb-8">
          Create an account, It's free!
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            data-testid="signup-email-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-full border-2 border-ticksy-navy bg-white px-6 py-4 text-ticksy-navy placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-ticksy-navy/20 font-body font-medium transition-all"
          />
          <input
            data-testid="signup-password-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-full border-2 border-ticksy-navy bg-white px-6 py-4 text-ticksy-navy placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-ticksy-navy/20 font-body font-medium transition-all"
          />

          {error && (
            <p data-testid="signup-error" className="text-red-600 text-sm font-body text-center">
              {error}
            </p>
          )}

          <p className="text-center font-body text-ticksy-navy/70 text-sm">
            Already have an account?{' '}
            <Link to="/login" data-testid="signup-login-link" className="font-bold text-ticksy-navy underline">
              Log In
            </Link>
          </p>

          <button
            data-testid="signup-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-ticksy-blue text-white font-heading font-bold text-lg py-4 px-8 shadow-[0_4px_0_0_#1E3DA0] hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}
