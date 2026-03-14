import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Package, ArrowLeft, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'

export default function OtpVerify() {
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email') || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputs = useRef([])

  const mutation = useMutation({
    mutationFn: (data) => axiosClient.post('/auth/verify-otp', data),
    onSuccess: () => {
      toast.success('OTP verified!')
      window.location.href = `/reset-password?email=${encodeURIComponent(email)}&otp=${otp.join('')}`
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid OTP'),
  })

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[i] = val; setOtp(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-apple-lg p-8 shadow-apple-xl">
          <Link to="/forgot-password" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-6 transition-colors w-fit">
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-apple-blue/90 flex items-center justify-center mb-4">
              <Package size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Enter OTP</h1>
            <p className="text-white/50 text-sm mt-1">Sent to <span className="text-white/70">{email}</span></p>
          </div>
          <div className="flex gap-2 justify-center mb-6">
            {otp.map((val, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text" inputMode="numeric" maxLength={1} value={val}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-white text-lg font-bold bg-white/10 border border-white/20 rounded-apple focus:ring-2 focus:ring-apple-blue focus:outline-none transition-all"
              />
            ))}
          </div>
          <button
            onClick={() => mutation.mutate({ email, otp: otp.join('') })}
            disabled={otp.join('').length !== 6 || mutation.isPending}
            className="w-full py-3 bg-apple-blue text-white text-sm font-semibold rounded-apple-full hover:bg-apple-blue-dark transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {mutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : 'Verify OTP'}
          </button>
        </div>
      </div>
    </div>
  )
}
