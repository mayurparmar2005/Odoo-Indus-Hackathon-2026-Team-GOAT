import axiosClient from './axiosClient'

export const authApi = {
  login:         (data) => axiosClient.post('/auth/login', data),
  register:      (data) => axiosClient.post('/auth/register', data),
  me:            ()     => axiosClient.get('/auth/me'),
  forgotPassword:(data) => axiosClient.post('/auth/forgot-password', data),
  verifyOtp:     (data) => axiosClient.post('/auth/verify-otp', data),
  resetPassword: (data) => axiosClient.post('/auth/reset-password', data),
  refresh:       ()     => axiosClient.post('/auth/refresh'),
}

export default authApi
