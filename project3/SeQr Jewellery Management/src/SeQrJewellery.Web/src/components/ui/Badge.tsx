import { cn } from '../../utils/format'

interface BadgeProps { label: string; colorClass?: string; className?: string }

export default function Badge({ label, colorClass = 'bg-gray-100 text-gray-700', className }: BadgeProps) {
  return (
    <span className={cn('badge', colorClass, className)}>{label}</span>
  )
}
