import axios from 'axios'
import { useAuthStore } from '../store/authStore'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const { accessToken, tenantIdentifier } = useAuthStore.getState()
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  if (tenantIdentifier) config.headers['X-Tenant-Identifier'] = tenantIdentifier
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data?.errors?.length) return data.errors.join(', ')
    if (data?.message) return data.message
    return error.message
  }
  return 'An unexpected error occurred'
}
