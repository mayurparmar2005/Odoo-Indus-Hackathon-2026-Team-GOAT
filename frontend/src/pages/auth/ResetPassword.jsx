import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Eye, EyeOff, Loader2, Check, X, ShieldCheck } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'

const passwordRequirements = [
  { label: 'More than 8 characters',      test: (p) => p.length > 8 },
  { label: 'One uppercase letter (A-Z)',   test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)',   test: (p) => /[a-z]/.test(p) },
  { label: 'One special character (!@#…)', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/~`;']/.test(p) },
]

export default function ResetPassword() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email') || ''
  const otp   = params.get('otp')   || ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [showConf,  setShowConf]  = useState(false)

  const passwordOk   = passwordRequirements.every(r => r.test(password))
  const confirmMatch = password === confirm && confirm !== ''

  const mutation = useMutation({
    mutationFn: (data) => axiosClient.post('/auth/reset-password', data),
    onSuccess: () => {
      toast.success('Password reset successfully! Please log in.')
      navigate('/login')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Reset failed. Please try again.'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!passwordOk)    return toast.error('Password does not meet all requirements')
    if (!confirmMatch)  return toast.error('Passwords do not match')
    // ✅ Backend expects 'new_password' (not 'password')
    mutation.mutate({ email, otp, new_password: password })
  }

  const inputBase = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
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
        <div className="animate-orb absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle,#0071E3,transparent)', top:'-10%', left:'-10%' }} />
        <div className="animate-orb absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-15"
          style={{ background: 'radial-gradient(circle,#30D158,transparent)', bottom:'0%', right:'-5%', animationDelay:'3s' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage:'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize:'60px 60px' }} />
      </div>

      <div className="relative w-full max-w-[380px] animate-slide-up" style={{ animationDuration:'0.6s' }}>
        {/* Glow */}
        <div className="absolute inset-0 rounded-apple-xl blur-2xl opacity-20 pointer-events-none"
          style={{ background:'linear-gradient(135deg,#0071E3,#30D158)', transform:'scale(1.05)' }} />

        <div className="relative rounded-apple-xl p-8 overflow-hidden"
          style={{ background:'rgba(255,255,255,0.06)', backdropFilter:'blur(40px)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 32px 80px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1)' }}>

          {/* Shimmer */}
          <div className="absolute top-0 left-8 right-8 h-px"
            style={{ background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)' }} />

          {/* Header */}
          <div className="flex flex-col items-center mb-7">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-60"
                style={{ background:'linear-gradient(135deg,#0071E3,#30D158)' }} />
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#0071E3,#0056B3)', boxShadow:'0 8px 24px rgba(0,113,227,0.5)' }}>
                <ShieldCheck size={28} className="text-white" />
              </div>
            </div>
            <h1 className="text-[26px] font-bold text-white tracking-tight" style={{ letterSpacing:'-0.5px' }}>
              New Password
            </h1>
            <p className="text-white/40 text-sm mt-1 font-medium">Set a new password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                  style={inputBase}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength checklist */}
              {password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {passwordRequirements.map(r => (
                    <div key={r.label}
                      className={`flex items-center gap-1.5 text-[11px] transition-colors ${r.test(password) ? 'text-apple-success' : 'text-white/35'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${r.test(password) ? 'bg-apple-success' : 'border border-white/20'}`}>
                        {r.test(password) && <Check size={8} className="text-white"/>}
                      </div>
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-apple text-white text-sm placeholder-white/25 transition-all duration-200 focus:outline-none"
                  style={{
                    ...inputBase,
                    border: confirm
                      ? (confirmMatch ? '1px solid rgba(48,209,88,0.6)' : '1px solid rgba(255,69,58,0.5)')
                      : '1px solid rgba(255,255,255,0.12)'
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConf(!showConf)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm && !confirmMatch && (
                <p className="text-[11px] text-apple-danger flex items-center gap-1">
                  <X size={10} /> Passwords do not match
                </p>
              )}
              {confirm && confirmMatch && (
                <p className="text-[11px] text-apple-success flex items-center gap-1">
                  <Check size={10} /> Passwords match
                </p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={mutation.isPending || !passwordOk || !confirmMatch}
                className="group w-full py-3.5 rounded-apple-full text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg,#0071E3 0%,#005DC1 100%)',
                  boxShadow: '0 4px 24px rgba(0,113,227,0.4),inset 0 1px 0 rgba(255,255,255,0.2)'
                }}>
                {mutation.isPending
                  ? <><Loader2 size={16} className="animate-spin" /> Resetting…</>
                  : <><ShieldCheck size={15} /><span>Reset Password</span></>}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-white/20 text-[11px] mt-5 font-medium">
          CoreInventory IMS · Hackathon 2026 · Team GOAT
        </p>
      </div>
    </div>
  )
}

