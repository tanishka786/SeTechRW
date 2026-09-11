import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Gem, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { authApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  const { isAuthenticated, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    defaultValues: { username: '', password: '' }
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data: LoginForm) => {
    setError('')
    try {
      const result = await authApi.login(data)
      setAuth(result.accessToken, result.refreshToken, result.user, result.tenant, result.tenant.identifier, result.permissions)
      toast.success(`Welcome back, ${result.user.firstName}!`)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl items-center justify-center shadow-lg mb-4">
            <Gem size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SeQr Jewellery</h1>
          <p className="text-gray-500 mt-1">Professional Jewellery Management</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign In</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Username"
              placeholder="Username or email"
              autoComplete="username"
              {...register('username', { required: 'Required' })}
              error={errors.username?.message}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Required' })}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
