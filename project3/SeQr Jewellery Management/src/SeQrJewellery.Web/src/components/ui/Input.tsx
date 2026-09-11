import { type InputHTMLAttributes, forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/format'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400',
          error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string | number; label: string }[]
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'px-3 py-2 rounded-lg border text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500',
          error ? 'border-red-500' : 'border-gray-300',
          className
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string }
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          'px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-400 resize-none',
          error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
TextArea.displayName = 'TextArea'
