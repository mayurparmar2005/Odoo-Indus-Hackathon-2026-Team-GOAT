import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Package, Eye, EyeOff, Loader2, ArrowRight, User, Mail, ShieldCheck } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'
import useAuthStore from '../../store/authStore'

// ── OTP Input Component ───────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputs = useRef([])
  const digits = value.split('')

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      const next = [...digits]
      next[i] = ''
      onChange(next.join(''))
      if (i > 0) inputs.current[i - 1]?.focus()
    }
  }

  const handleChange = (i, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = char
    onChange(next.join(''))
    if (char && i < 5) inputs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted.padEnd(6, '').slice(0, 6))
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center text-white text-xl font-bold rounded-apple transition-all duration-200 focus:outline-none"
          style={{
            background: digits[i] ? 'rgba(0,113,227,0.15)' : 'rgba(255,255,255,0.07)',
            border: digits[i] ? '1.5px solid rgba(0,113,227,0.8)' : '1px solid rgba(255,255,255,0.15)',
            boxShadow: digits[i] ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ── Main Login Component ──────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)

  // step: 'credentials' | 'otp'
  const [step, setStep] = useState('credentials')
  const [form, setForm] = useState({ login_id: '', password: '' })
  const [otp, setOtp] = useState('')
  const [loginId, setLoginId] = useState('')       // stored after step 1
  const [maskedEmail, setMaskedEmail] = useState('') // shown in OTP screen
  const [showPw, setShowPw] = useState(false)

  // Step 1 — send OTP
  const step1 = useMutation({
    mutationFn: (data) => axiosClient.post('/auth/login', data),
    onSuccess: (res) => {
      setLoginId(res.data.login_id)
      setMaskedEmail(res.data.masked_email)
      setStep('otp')
      toast.success(`OTP sent to ${res.data.masked_email}`)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid login ID or password'),
  })

  // Step 2 — verify OTP
  const step2 = useMutation({
    mutationFn: (data) => axiosClient.post('/auth/login/verify-otp', data),
    onSuccess: (res) => {
      loginStore(res.data.user, res.data.access_token)
      toast.success(`Welcome back, ${res.data.user.name}! ✅`)
      navigate('/dashboard')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid OTP'),
  })

  const handleCredentials = (e) => {
    e.preventDefault()
    if (!form.login_id.trim()) return toast.error('Please enter your Login ID')
    if (!form.password) return toast.error('Please enter your password')
    step1.mutate(form)
  }

  const handleOtp = (e) => {
    e.preventDefault()
    if (otp.length < 6) return toast.error('Please enter all 6 digits')
    step2.mutate({ login_id: loginId, otp })
  }

  // Re-send OTP
  const resend = useMutation({
    mutationFn: () => axiosClient.post('/auth/login', { login_id: form.login_id, password: form.password }),
    onSuccess: () => toast.success('New OTP sent!'),
    onError: () => toast.error('Could not resend OTP'),
  })

  // ── Shared style helpers ────────────────────────────────────────────────────
  const inputBase = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    WebkitTextFillColor: 'white',
  }
  const onFocus = (e) => {
    e.target.style.border = '1px solid rgba(0,113,227,0.7)'
    e.target.style.background = 'rgba(0,113,227,0.08)'
    e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'
  }
  const onBlur = (e) => {
    e.target.style.border = '1px solid rgba(255,255,255,0.12)'
    e.target.style.background = 'rgba(255,255,255,0.07)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at 60% 20%, #0d1b3e 0%, #050d1f 50%, #000000 100%)' }}>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-orb absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle, #0071E3, transparent)', top: '-10%', left: '-10%' }} />
        <div className="animate-orb absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15"
          style={{ background: 'radial-gradient(circle, #5AC8FA, transparent)', bottom: '0%', right: '-5%', animationDelay: '4s' }} />
        <div className="animate-float absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-10"
          style={{ background: 'radial-gradient(circle, #30D158, transparent)', top: '50%', left: '50%', animationDelay: '2s' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
      </div>

      <div className="relative w-full max-w-[380px] animate-slide-up" style={{ animationDuration: '0.6s' }}>
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-apple-xl blur-2xl opacity-20 pointer-events-none"
          style={{ background: 'linear-gradient(135deg,#0071E3,#5AC8FA,#0071E3)', transform: 'scale(1.05)' }} />

        <div className="relative rounded-apple-xl p-8 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>

          {/* Shimmer */}
          <div className="absolute top-0 left-8 right-8 h-px"
            style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                style={{ background: step === 'otp' ? 'linear-gradient(135deg,#30D158,#0071E3)' : 'linear-gradient(135deg,#0071E3,#5AC8FA)' }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500"
                style={{
                  background: step === 'otp' ? 'linear-gradient(135deg,#30D158,#25A84B)' : 'linear-gradient(135deg,#0071E3,#0056B3)',
                  boxShadow: step === 'otp' ? '0 8px 24px rgba(48,209,88,0.5)' : '0 8px 24px rgba(0,113,227,0.5)'
                }}>
                {step === 'otp'
                  ? <ShieldCheck size={30} className="text-white" />
                  : <Package size={30} className="text-white" />}
              </div>
            </div>
            <h1 className="text-[26px] font-bold text-white tracking-tight" style={{ letterSpacing: '-0.5px' }}>
              CoreInventory
            </h1>
            <p className="text-white/40 text-sm mt-1 font-medium">
              {step === 'otp' ? 'Enter your verification code' : 'Sign in to your account'}
            </p>
          </div>

          {/* ── STEP 1: Credentials ── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Login ID</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                    <User size={15} />
                  </span>
                  <input
                    id="login-id"
                    type="text"
                    required
                    value={form.login_id}
                    onChange={(e) => setForm({ ...form, login_id: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="Your login ID"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-xs text-apple-blue-light hover:text-white transition-colors font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 pr-11 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button type="submit" disabled={step1.isPending}
                  className="group w-full py-3.5 rounded-apple-full text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{
                    background: step1.isPending ? 'rgba(0,113,227,0.6)' : 'linear-gradient(135deg,#0071E3 0%,#005DC1 100%)',
                    boxShadow: step1.isPending ? 'none' : '0 4px 24px rgba(0,113,227,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}>
                  {step1.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Sending OTP…</>
                    : <><span>Sign In</span><ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" /></>}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 'otp' && (
            <form onSubmit={handleOtp} className="space-y-5">
              {/* Info box */}
              <div className="rounded-apple px-4 py-3 text-center"
                style={{ background: 'rgba(0,113,227,0.1)', border: '1px solid rgba(0,113,227,0.25)' }}>
                <div className="flex items-center justify-center gap-2 text-white/60 text-xs mb-1">
                  <Mail size={13} />
                  <span>Code sent to</span>
                </div>
                <p className="text-white text-sm font-semibold">{maskedEmail}</p>
                <p className="text-white/35 text-[11px] mt-0.5">Valid for 10 minutes</p>
              </div>

              {/* 6-digit OTP boxes */}
              <OtpInput value={otp} onChange={setOtp} />

              <div className="pt-1">
                <button type="submit" disabled={step2.isPending || otp.length < 6}
                  className="group w-full py-3.5 rounded-apple-full text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg,#30D158 0%,#25A84B 100%)',
                    boxShadow: '0 4px 24px rgba(48,209,88,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}>
                  {step2.isPending
                    ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                    : <><ShieldCheck size={15} /><span>Verify & Login</span></>}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button type="button"
                  onClick={() => { setStep('credentials'); setOtp('') }}
                  className="text-white/35 hover:text-white/70 transition-colors">
                  ← Change credentials
                </button>
                <button type="button"
                  onClick={() => resend.mutate()}
                  disabled={resend.isPending}
                  className="text-apple-blue-light hover:text-white transition-colors font-medium disabled:opacity-50">
                  {resend.isPending ? 'Sending…' : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-[11px] mt-5 font-medium">
          CoreInventory IMS · Hackathon 2026 · Team GOAT
        </p>
        <p className="text-center text-white/35 text-xs mt-2">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-apple-blue-light hover:text-white transition-colors font-semibold underline-offset-2 hover:underline cursor-pointer"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
