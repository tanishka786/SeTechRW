import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, X } from 'lucide-react'
import { cn } from '../../utils/format'
import Spinner from './Spinner'

export interface ComboboxOption {
  value: string
  label: string
  /** Secondary text shown to the right of the label */
  sublabel?: string
  /** Indent the option (e.g. subcategories) */
  indent?: boolean
}

interface ComboboxProps {
  label?: string
  error?: string
  placeholder?: string
  options: ComboboxOption[]
  value: string
  onChange: (value: string, option?: ComboboxOption) => void
  /** Called as the user types. When provided with filterLocally=false, parent drives the options (async search). */
  onInputChange?: (text: string) => void
  /** Filter options client-side against the typed text (default true) */
  filterLocally?: boolean
  /** When set, shows a "Create …" entry if the typed text matches no option exactly */
  onCreate?: (text: string) => void
  createLabel?: (text: string) => string
  loading?: boolean
  /** Show a clear (x) button when a value is selected */
  allowClear?: boolean
  disabled?: boolean
  emptyMessage?: string
}

interface DropdownPos {
  top: number
  left: number
  width: number
  maxHeight: number
  openUp: boolean
}

export default function Combobox({
  label, error, placeholder, options, value, onChange, onInputChange,
  filterLocally = true, onCreate, createLabel, loading, allowClear, disabled,
  emptyMessage = 'No matches found',
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find(o => o.value === value)

  // Keep the input text in sync with the selected option while closed.
  // If the selected option is temporarily absent (async search), keep the last text.
  useEffect(() => {
    if (open) return
    if (!value) { setText(''); return }
    if (selected) setText(selected.label.trim())
  }, [selected?.label, open, value, selected])

  const updatePosition = () => {
    const el = inputRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
    const maxHeight = Math.min(224, Math.max(120, openUp ? spaceAbove : spaceBelow))
    setPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUp,
    })
  }

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    updatePosition()
    const onScrollOrResize = () => updatePosition()
    window.addEventListener('resize', onScrollOrResize)
    // Capture scroll from nested overflow containers (e.g. modal body)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const filtered = useMemo(() => {
    if (!filterLocally) return options
    const q = text.trim().toLowerCase()
    if (!q) return options
    // If the typed text is exactly the currently selected label, show the full list
    if (selected && q === selected.label.trim().toLowerCase()) return options
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    )
  }, [options, text, filterLocally, selected])

  const trimmed = text.trim()
  const showCreate = !!onCreate && trimmed.length > 0 &&
    !options.some(o => o.label.trim().toLowerCase() === trimmed.toLowerCase())
  const rowCount = filtered.length + (showCreate ? 1 : 0)

  useEffect(() => {
    if (highlighted >= rowCount) setHighlighted(Math.max(0, rowCount - 1))
  }, [rowCount, highlighted])

  const scrollTo = (idx: number) => {
    listRef.current?.children[idx]?.scrollIntoView({ block: 'nearest' })
  }

  const select = (opt: ComboboxOption) => {
    onChange(opt.value, opt)
    setText(opt.label.trim())
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => { const n = Math.min(h + 1, rowCount - 1); scrollTo(n); return n })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => { const n = Math.max(h - 1, 0); scrollTo(n); return n })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted < filtered.length) {
        const opt = filtered[highlighted]
        if (opt) select(opt)
      } else if (showCreate) {
        onCreate?.(trimmed)
        setOpen(false)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const dropdown = open && !disabled && pos && createPortal(
    <ul
      ref={listRef}
      role="listbox"
      style={{
        position: 'fixed',
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        zIndex: 100,
      }}
      className="overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1 text-sm"
    >
      {filtered.map((o, i) => (
        <li
          key={o.value}
          role="option"
          aria-selected={o.value === value}
          onMouseDown={e => { e.preventDefault(); select(o) }}
          onMouseEnter={() => setHighlighted(i)}
          className={cn(
            'px-3 py-2 cursor-pointer flex items-center justify-between gap-2',
            o.indent && 'pl-7',
            i === highlighted ? 'bg-amber-50 text-amber-900' : 'text-gray-700',
            o.value === value && 'font-medium'
          )}
        >
          <span className="truncate">{o.label.trim()}</span>
          {o.sublabel && <span className="text-xs text-gray-400 shrink-0">{o.sublabel}</span>}
        </li>
      ))}
      {filtered.length === 0 && !showCreate && (
        <li className="px-3 py-2 text-gray-400">{loading ? 'Searching…' : emptyMessage}</li>
      )}
      {showCreate && (
        <li
          onMouseDown={e => { e.preventDefault(); onCreate?.(trimmed); setOpen(false) }}
          onMouseEnter={() => setHighlighted(filtered.length)}
          className={cn(
            'px-3 py-2 cursor-pointer flex items-center gap-2 border-t border-gray-100 text-amber-700',
            highlighted === filtered.length && 'bg-amber-50'
          )}
        >
          <Plus size={14} />
          {createLabel ? createLabel(trimmed) : `Create "${trimmed}"`}
        </li>
      )}
    </ul>,
    document.body
  )

  return (
    <div className="flex flex-col gap-1" ref={rootRef}>
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          onChange={e => {
            const next = e.target.value
            setText(next)
            setOpen(true)
            setHighlighted(0)
            onInputChange?.(next)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full px-3 py-2 pr-14 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400',
            error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400',
            disabled && 'bg-gray-50 text-gray-400'
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Spinner size="sm" />}
          {allowClear && value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => { onChange('', undefined); setText(''); onInputChange?.('') }}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setOpen(o => !o)}
            className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>
      {dropdown}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
