import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({ baseURL: API_URL })

export function normalizeListResponse(data) {
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null }
  }

  const results = Array.isArray(data?.results) ? data.results : []
  return {
    results,
    count: Number.isFinite(data?.count) ? data.count : results.length,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  }
}

export function getApiErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data[0] || fallback
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value[0]) return String(value[0])
      if (typeof value === 'string') return value
    }
  }
  return fallback
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh = localStorage.getItem('refresh')
      if (!refresh) return Promise.reject(error)
      try {
        const { data } = await axios.post(`${API_URL}/token/refresh/`, { refresh })
        localStorage.setItem('access', data.access)
        originalRequest.headers.Authorization = `Bearer ${data.access}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

export default api
