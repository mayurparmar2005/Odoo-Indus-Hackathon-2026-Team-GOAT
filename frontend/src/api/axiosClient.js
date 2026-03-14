import axios from 'axios'
import useAuthStore from '../store/authStore'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT token to every request
axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — auto logout (but NOT for auth routes themselves)
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ''
    const isAuthRoute = url.includes('/auth/')
    if (err.response?.status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default axiosClient
