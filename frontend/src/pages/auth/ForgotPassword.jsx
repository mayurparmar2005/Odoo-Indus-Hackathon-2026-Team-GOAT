import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const mutation = useMutation({
    mutationFn: (data) => axiosClient.post('/auth/forgot-password', data),
    onSuccess: () => {
      toast.success('OTP sent to your email!')
      window.location.href = `/verify-otp?email=${encodeURIComponent(email)}`
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send OTP'),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-apple-lg p-8 shadow-apple-xl">
          <Link to="/login" className="flex items-center gap-2 text-white/50 hover:text-white text-xs mb-6 transition-colors w-fit">
            <ArrowLeft size={14} /> Back to login
          </Link>
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-apple-blue/90 flex items-center justify-center mb-4">
              <Package size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Forgot Password?</h1>
            <p className="text-white/50 text-sm mt-1">We'll send an OTP to your email</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ email }) }} className="space-y-4">
            <div>
              <label className="block text-white/70 text-xs font-medium mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-apple text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-apple-blue transition-all"
                placeholder="you@company.com"
              />
            </div>
            <button type="submit" disabled={mutation.isPending}
              className="w-full py-3 bg-apple-blue text-white text-sm font-semibold rounded-apple-full hover:bg-apple-blue-dark transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {mutation.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send OTP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
