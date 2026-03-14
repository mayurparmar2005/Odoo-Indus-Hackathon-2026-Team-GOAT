import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Package, Eye, EyeOff, Loader2, ArrowRight, UserPlus, Check, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'
import useAuthStore from '../../store/authStore'

const passwordRequirements = [
  { label: 'More than 8 characters',      test: (p) => p.length > 8 },
  { label: 'One uppercase letter (A-Z)',   test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)',   test: (p) => /[a-z]/.test(p) },
  { label: 'One special character (!@#…)', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/~`';]/.test(p) },
]

function validateLoginId(id) {
  if (!id) return 'Login ID is required'
  if (id.length < 6) return 'Login ID must be at least 6 characters'
  if (id.length > 12) return 'Login ID must be at most 12 characters'
  if (!/^[A-Za-z0-9_]+$/.test(id)) return 'Only letters, digits, and underscores allowed'
  return null
}

export default function Register() {
  const navigate = useNavigate()
  const loginStore = useAuthStore((s) => s.login)

  const [form, setForm] = useState({ login_id: '', name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loginIdTouched, setLoginIdTouched] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const loginIdError   = validateLoginId(form.login_id)
  const passwordOk     = passwordRequirements.every(r => r.test(form.password))
  const confirmMatch   = form.password === form.confirm && form.confirm !== ''
  const isFormValid    = !loginIdError && form.name && form.email && passwordOk && confirmMatch

  const mutation = useMutation({
    mutationFn: (data) => axiosClient.post('/auth/register', data),
    onSuccess: (res) => {
      loginStore(res.data.user, res.data.access_token)
      toast.success(`Welcome, ${res.data.user.name}! Account created 🎉`)
      navigate('/dashboard')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Registration failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoginIdTouched(true)
    // Show clear error for each missing/invalid field
    if (!form.login_id.trim()) return toast.error('Login ID is required')
    if (loginIdError)           return toast.error(loginIdError)
    if (!form.name.trim())      return toast.error('Full name is required')
    if (!form.email.trim())     return toast.error('Email address is required')
    if (!form.password)         return toast.error('Password is required')
    if (!passwordOk)            return toast.error('Password does not meet all requirements')
    if (!form.confirm)          return toast.error('Please re-enter your password')
    if (!confirmMatch)          return toast.error('Passwords do not match')
    mutation.mutate({
      login_id: form.login_id,
      name: form.name,
      email: form.email,
      password: form.password,
    })
  }

  const focusStyle = (color = '48,209,88') => (e) => {
    e.target.style.border = `1px solid rgba(${color},0.7)`
    e.target.style.boxShadow = `0 0 0 3px rgba(${color},0.12)`
    e.target.style.background = `rgba(${color},0.06)`
  }
  const blurStyle = (e) => {
    e.target.style.border = '1px solid rgba(255,255,255,0.12)'
    e.target.style.boxShadow = 'none'
    e.target.style.background = 'rgba(255,255,255,0.07)'
  }

  const loginIdBorder = loginIdTouched
    ? loginIdError
      ? '1px solid rgba(255,69,58,0.6)'
      : '1px solid rgba(48,209,88,0.6)'
    : '1px solid rgba(255,255,255,0.12)'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at 60% 20%, #0d1b3e 0%, #050d1f 50%, #000000 100%)' }}>

      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="animate-orb absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle,#30D158,transparent)', top:'-10%', right:'-10%' }} />
        <div className="animate-orb absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15"
          style={{ background: 'radial-gradient(circle,#0071E3,transparent)', bottom:'0%', left:'-5%', animationDelay:'3s' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize:'60px 60px' }} />
      </div>

      <div className="relative w-full max-w-[420px] animate-slide-up py-6" style={{ animationDuration:'0.6s' }}>
        {/* Glow */}
        <div className="absolute inset-0 rounded-apple-xl blur-2xl opacity-20"
          style={{ background:'linear-gradient(135deg,#30D158,#0071E3,#30D158)', transform:'scale(1.05)' }} />

        <div className="relative rounded-apple-xl p-8 overflow-hidden"
          style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 32px 80px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1)' }}>

          {/* Shimmer */}
          <div className="absolute top-0 left-8 right-8 h-px"
            style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />

          {/* Header */}
          <div className="flex flex-col items-center mb-7">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                style={{ background:'linear-gradient(135deg,#30D158,#0071E3)' }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#30D158,#25A84B)', boxShadow:'0 8px 24px rgba(48,209,88,0.45)' }}>
                <UserPlus size={28} className="text-white" />
              </div>
            </div>
            <h1 className="text-[26px] font-bold text-white tracking-tight" style={{ letterSpacing:'-0.5px' }}>
              Create Account
            </h1>
            <p className="text-white/40 text-sm mt-1 font-medium">Join CoreInventory today</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Login ID */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">
                Login ID <span className="text-white/30 normal-case font-normal">(6–12 chars, unique)</span>
              </label>
              <input
                id="reg-login-id"
                type="text"
                required
                value={form.login_id}
                onChange={set('login_id')}
                onBlur={() => setLoginIdTouched(true)}
                maxLength={12}
                className="w-full px-4 py-3 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                style={{ background:'rgba(255,255,255,0.07)', border: loginIdBorder }}
                onFocus={focusStyle('48,209,88')}
                placeholder="e.g. john_doe1"
                autoComplete="username"
              />
              {loginIdTouched && loginIdError && (
                <p className="text-[11px] text-apple-danger flex items-center gap-1">
                  <X size={10} /> {loginIdError}
                </p>
              )}
              {loginIdTouched && !loginIdError && (
                <p className="text-[11px] text-apple-success flex items-center gap-1">
                  <Check size={10} /> Looks good
                </p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Full Name</label>
              <input
                id="reg-name"
                type="text"
                required
                value={form.name}
                onChange={set('name')}
                className="w-full px-4 py-3 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}
                onFocus={focusStyle('48,209,88')}
                onBlur={blurStyle}
                placeholder="Your full name"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Email Address</label>
              <input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                className="w-full px-4 py-3 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}
                onFocus={focusStyle('48,209,88')}
                onBlur={blurStyle}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={set('password')}
                  className="w-full px-4 py-3 pr-11 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                  style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}
                  onFocus={focusStyle('48,209,88')}
                  onBlur={blurStyle}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>

              {/* Password requirement checklist */}
              {form.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {passwordRequirements.map(r => (
                    <div key={r.label}
                      className={`flex items-center gap-1.5 text-[11px] transition-colors ${r.test(form.password) ? 'text-apple-success' : 'text-white/35'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${r.test(form.password) ? 'bg-apple-success' : 'border border-white/20'}`}>
                        {r.test(form.password) && <Check size={8} className="text-white"/>}
                      </div>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Re-enter Password</label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={set('confirm')}
                  className="w-full px-4 py-3 pr-11 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                  style={{
                    background:'rgba(255,255,255,0.07)',
                    border: form.confirm
                      ? (confirmMatch ? '1px solid rgba(48,209,88,0.6)' : '1px solid rgba(255,69,58,0.5)')
                      : '1px solid rgba(255,255,255,0.12)'
                  }}
                  onFocus={focusStyle('48,209,88')}
                  onBlur={blurStyle}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {form.confirm && !confirmMatch && (
                <p className="text-[11px] text-apple-danger flex items-center gap-1">
                  <X size={10}/> Passwords do not match
                </p>
              )}
              {form.confirm && confirmMatch && (
                <p className="text-[11px] text-apple-success flex items-center gap-1">
                  <Check size={10}/> Passwords match
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="group w-full py-3.5 rounded-apple-full text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg,#30D158 0%,#25A84B 100%)',
                  boxShadow: '0 4px 24px rgba(48,209,88,0.4),inset 0 1px 0 rgba(255,255,255,0.2)'
                }}>
                {mutation.isPending
                  ? <><Loader2 size={16} className="animate-spin"/> Creating account…</>
                  : <><span>Create Account</span><ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200"/></>}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="mt-5 text-center text-white/40 text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-apple-blue-light hover:text-white transition-colors font-semibold">Sign In</Link>
          </p>
        </div>

        <p className="text-center text-white/20 text-[11px] mt-5 font-medium">
          CoreInventory IMS · Hackathon 2026 · Team GOAT
        </p>
      </div>
    </div>
  )
}
